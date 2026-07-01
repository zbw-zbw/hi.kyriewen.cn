import { NextResponse } from 'next/server';
import { db, blogPosts } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/* ── Juejin API types ────────────────────────────────────────────── */

interface JuejinArticle {
  article_id: string;
  article_info: {
    article_id: string;
    title: string;
    brief_content: string;
    cover_image: string;
    ctime: string;
  };
  tags: Array<{ tag_name: string }>;
}

/* ── Slug helper ─────────────────────────────────────────────────── */

function slugify(title: string, source: string, id: string): string {
  const eng = title
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const prefix = eng.length >= 3 ? eng.substring(0, 50) : source;
  return `${prefix}-${id.slice(-10)}`;
}

/* ── Sync Juejin ─────────────────────────────────────────────────── */

async function syncJuejin(userId: string) {
  const articles: JuejinArticle[] = [];
  let cursor = '0';
  let hasMore = true;
  let page = 0;

  while (hasMore && page < 5) {
    const res = await fetch('https://api.juejin.cn/content_api/v1/article/query_list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, sort_type: 2, cursor }),
    });
    if (!res.ok) throw new Error(`Juejin API error: ${res.status}`);
    const data = await res.json();
    if (data.err_no !== 0) throw new Error(`Juejin API: ${data.err_msg}`);
    articles.push(...(data.data || []));
    cursor = data.cursor;
    hasMore = data.has_more;
    page++;
  }

  const existing = new Set(
    (
      await db
        .select({ sourceId: blogPosts.sourceId })
        .from(blogPosts)
        .where(eq(blogPosts.source, 'juejin'))
    )
      .map((p) => p.sourceId)
      .filter(Boolean),
  );

  let imported = 0,
    skipped = 0;
  for (const art of articles) {
    const id = art.article_info.article_id;
    if (existing.has(id)) {
      skipped++;
      continue;
    }

    const tags = (art.tags || []).map((t) => t.tag_name);
    await db.insert(blogPosts).values({
      slug: slugify(art.article_info.title, 'juejin', id),
      title: art.article_info.title,
      summary: art.article_info.brief_content || null,
      content: art.article_info.brief_content || '',
      tags: JSON.stringify(tags),
      lang: 'zh',
      draft: 1,
      coverImage: art.article_info.cover_image || null,
      source: 'juejin',
      sourceId: id,
      sourceUrl: `https://juejin.cn/post/${id}`,
      publishedAt: new Date(parseInt(art.article_info.ctime, 10) * 1000),
    });
    imported++;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }
  return { source: 'juejin', fetched: articles.length, imported, skipped };
}

/* ── GET handler ─────────────────────────────────────────────────── */

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const juejinUser = process.env.JUEJIN_USER_ID;
  if (!juejinUser) {
    return NextResponse.json({ error: 'JUEJIN_USER_ID not configured' }, { status: 500 });
  }

  try {
    const result = await syncJuejin(juejinUser);
    return NextResponse.json({ ok: true, results: [result], ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
