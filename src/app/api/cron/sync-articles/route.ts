import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/* ── RSS helpers (CSDN) ─────────────────────────────────────────── */

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1] ?? '';
    const title = cdata(b, 'title');
    const link = tag(b, 'link');
    const pubDate = tag(b, 'pubDate');
    const description = cdata(b, 'description');
    if (title && link) items.push({ title, link, pubDate, description });
  }
  return items;
}

function cdata(xml: string, t: string): string {
  const m = new RegExp(`<${t}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${t}>`, 'i').exec(xml);
  return m ? (m[1] ?? '').trim() : tag(xml, t);
}

function tag(xml: string, t: string): string {
  const m = new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, 'i').exec(xml);
  return m ? (m[1] ?? '').trim() : '';
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
    .replace(/[^\w\s-]/g, ' ').trim().toLowerCase()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const prefix = eng.length >= 3 ? eng.substring(0, 50) : source;
  return `${prefix}-${id.slice(-10)}`;
}

/* ── Sync CSDN ───────────────────────────────────────────────────── */

async function syncCsdn(userId: string) {
  const rssRes = await fetch(`https://blog.csdn.net/${userId}/rss/list`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!rssRes.ok) throw new Error(`CSDN RSS failed: ${rssRes.status}`);
  const articles = parseRssItems(await rssRes.text());

  const existing = new Set(
    (await db.select({ sourceId: blogPosts.sourceId }).from(blogPosts).where(eq(blogPosts.source, 'csdn')))
      .map((p) => p.sourceId).filter(Boolean),
  );

  let imported = 0, skipped = 0;
  for (const art of articles) {
    const id = art.link.match(/\/details\/(\d+)/)?.[1] ?? '';
    if (!id || existing.has(id)) { skipped++; continue; }
    await db.insert(blogPosts).values({
      slug: slugify(art.title, 'csdn', id),
      title: art.title,
      summary: art.description || null,
      content: art.description || '(Content pending backfill)',
      tags: '[]', lang: 'zh', draft: 1, coverImage: null,
      source: 'csdn', sourceId: id, sourceUrl: art.link,
      publishedAt: art.pubDate ? new Date(art.pubDate) : new Date(),
    });
    imported++;
  }
  return { source: 'csdn', fetched: articles.length, imported, skipped };
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
    (await db.select({ sourceId: blogPosts.sourceId }).from(blogPosts).where(eq(blogPosts.source, 'juejin')))
      .map((p) => p.sourceId).filter(Boolean),
  );

  let imported = 0, skipped = 0;
  for (const art of articles) {
    const id = art.article_info.article_id;
    if (existing.has(id)) { skipped++; continue; }
    const tags = (art.tags || []).map((t) => t.tag_name);
    await db.insert(blogPosts).values({
      slug: slugify(art.article_info.title, 'juejin', id),
      title: art.article_info.title,
      summary: art.article_info.brief_content || null,
      content: art.article_info.brief_content || '(Content pending backfill)',
      tags: JSON.stringify(tags), lang: 'zh', draft: 1,
      coverImage: art.article_info.cover_image || null,
      source: 'juejin', sourceId: id,
      sourceUrl: `https://juejin.cn/post/${id}`,
      publishedAt: new Date(parseInt(art.article_info.ctime, 10) * 1000),
    });
    imported++;
  }
  return { source: 'juejin', fetched: articles.length, imported, skipped };
}

/* ── GET handler ─────────────────────────────────────────────────── */

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{ source: string; fetched: number; imported: number; skipped: number; error?: string }> = [];

  // Sync CSDN
  const csdnUser = process.env.CSDN_USER_ID;
  if (csdnUser) {
    try {
      results.push(await syncCsdn(csdnUser));
    } catch (e) {
      results.push({ source: 'csdn', fetched: 0, imported: 0, skipped: 0, error: String(e) });
    }
  }

  // Sync Juejin
  const juejinUser = process.env.JUEJIN_USER_ID;
  if (juejinUser) {
    try {
      results.push(await syncJuejin(juejinUser));
    } catch (e) {
      results.push({ source: 'juejin', fetched: 0, imported: 0, skipped: 0, error: String(e) });
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'No source configured (CSDN_USER_ID / JUEJIN_USER_ID)' }, { status: 500 });
  }

  const total = {
    imported: results.reduce((s, r) => s + r.imported, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
  };

  return NextResponse.json({ ok: true, results, ...total });
}
