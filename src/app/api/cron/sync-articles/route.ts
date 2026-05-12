import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/* ── HTML → Markdown converter ───────────────────────────────────── */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(
    /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) =>
      `\n\`\`\`${lang || ''}\n${decodeEntities(code.replace(/<[^>]+>/g, ''))}\n\`\`\`\n`,
  );
  md = md.replace(
    /<h([1-5])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, n, c) => `\n${'#'.repeat(+n)} ${stripTags(c)}\n`,
  );
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => {
    const s = stripTags(t).trim();
    return s ? `[${s}](${h})` : '';
  });
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${decodeEntities(c)}\``);
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${stripTags(c).trim()}\n`);
  md = md.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, c) =>
      stripTags(c)
        .trim()
        .split('\n')
        .map((l: string) => `> ${l}`)
        .join('\n') + '\n',
  );
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `\n${stripTags(c).trim()}\n`);
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = decodeEntities(md);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
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
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const prefix = eng.length >= 3 ? eng.substring(0, 50) : source;
  return `${prefix}-${id.slice(-10)}`;
}

/* ── Content proxy (China mainland server) ───────────────────────── */

const CONTENT_PROXY_URL = process.env.CONTENT_PROXY_URL ?? '';
const CONTENT_PROXY_SECRET = process.env.CONTENT_PROXY_SECRET ?? '';

async function fetchViaProxy(
  source: 'csdn' | 'juejin',
  url?: string,
  articleId?: string,
): Promise<string | null> {
  if (!CONTENT_PROXY_URL) return null;
  try {
    const res = await fetch(`${CONTENT_PROXY_URL}/api/fetch-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONTENT_PROXY_SECRET ? { Authorization: `Bearer ${CONTENT_PROXY_SECRET}` } : {}),
      },
      body: JSON.stringify({ source, url, articleId }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? data.content : null;
  } catch {
    return null;
  }
}

/* ── Fetch full article content ──────────────────────────────────── */

async function fetchJuejinContent(articleId: string): Promise<string | null> {
  // 1. Try proxy (China mainland) first
  const proxied = await fetchViaProxy('juejin', undefined, articleId);
  if (proxied) return proxied;

  // 2. Fallback: direct request
  try {
    const res = await fetch('https://api.juejin.cn/content_api/v1/article/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const markdownBody = data?.data?.article_info?.mark_content;
    if (markdownBody && markdownBody.length >= 50) return markdownBody;
    return null;
  } catch {
    return null;
  }
}

async function fetchCsdnContent(articleUrl: string): Promise<string | null> {
  // 1. Try proxy (China mainland) first
  const proxied = await fetchViaProxy('csdn', articleUrl);
  if (proxied) return proxied;

  // 2. Fallback: direct request
  try {
    const res = await fetch(articleUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const startIdx = html.indexOf('id="content_views"');
    if (startIdx === -1) return null;
    const tagEnd = html.indexOf('>', startIdx);
    let body = html.substring(tagEnd + 1);

    const endMarkers = [
      'id="treeSkill"',
      'class="hide-article-box"',
      'class="article-copyright"',
      'class="blog-tags-box"',
      'class="article-bar-bottom"',
      'id="article_bottom_area"',
    ];
    for (const marker of endMarkers) {
      const idx = body.indexOf(marker);
      if (idx > 0) {
        let cursor = idx;
        while (cursor > 0 && body[cursor] !== '<') cursor--;
        body = body.substring(0, cursor);
        break;
      }
    }

    body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    const md = htmlToMarkdown(body.trim());
    return md.length >= 50 ? md : null;
  } catch {
    return null;
  }
}

/* ── Sync CSDN ───────────────────────────────────────────────────── */

async function syncCsdn(userId: string) {
  const rssRes = await fetch(`https://blog.csdn.net/${userId}/rss/list`, {
    headers: { 'User-Agent': UA },
  });
  if (!rssRes.ok) throw new Error(`CSDN RSS failed: ${rssRes.status}`);
  const articles = parseRssItems(await rssRes.text());

  const existing = new Set(
    (
      await db
        .select({ sourceId: blogPosts.sourceId })
        .from(blogPosts)
        .where(eq(blogPosts.source, 'csdn'))
    )
      .map((p) => p.sourceId)
      .filter(Boolean),
  );

  let imported = 0,
    skipped = 0,
    contentFailed = 0;
  for (const art of articles) {
    const id = art.link.match(/\/details\/(\d+)/)?.[1] ?? '';
    if (!id || existing.has(id)) {
      skipped++;
      continue;
    }

    // Fetch full article content from detail page
    const fullContent = await fetchCsdnContent(art.link);

    await db.insert(blogPosts).values({
      slug: slugify(art.title, 'csdn', id),
      title: art.title,
      summary: art.description || null,
      content: fullContent || art.description || '',
      tags: '[]',
      lang: 'zh',
      draft: 1,
      coverImage: null,
      source: 'csdn',
      sourceId: id,
      sourceUrl: art.link,
      publishedAt: art.pubDate ? new Date(art.pubDate) : new Date(),
    });
    imported++;
    if (!fullContent) contentFailed++;

    // Rate limiting: small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }
  return { source: 'csdn', fetched: articles.length, imported, skipped, contentFailed };
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
    skipped = 0,
    contentFailed = 0;
  for (const art of articles) {
    const id = art.article_info.article_id;
    if (existing.has(id)) {
      skipped++;
      continue;
    }

    // Fetch full Markdown content via detail API
    const fullContent = await fetchJuejinContent(id);

    const tags = (art.tags || []).map((t) => t.tag_name);
    await db.insert(blogPosts).values({
      slug: slugify(art.article_info.title, 'juejin', id),
      title: art.article_info.title,
      summary: art.article_info.brief_content || null,
      content: fullContent || art.article_info.brief_content || '',
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
    if (!fullContent) contentFailed++;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }
  return { source: 'juejin', fetched: articles.length, imported, skipped, contentFailed };
}

/* ── GET handler ─────────────────────────────────────────────────── */

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse optional sources filter from query params (e.g. ?sources=csdn,juejin)
  const url = new URL(req.url);
  const sourcesParam = url.searchParams.get('sources');
  const allowedSources = sourcesParam
    ? new Set(sourcesParam.split(',').map((s) => s.trim().toLowerCase()))
    : null; // null means all sources

  const results: Array<{
    source: string;
    fetched: number;
    imported: number;
    skipped: number;
    contentFailed?: number;
    error?: string;
  }> = [];

  // Sync CSDN (only if no filter or filter includes csdn)
  const csdnUser = process.env.CSDN_USER_ID;
  if (csdnUser && (!allowedSources || allowedSources.has('csdn'))) {
    try {
      results.push(await syncCsdn(csdnUser));
    } catch (e) {
      results.push({ source: 'csdn', fetched: 0, imported: 0, skipped: 0, error: String(e) });
    }
  }

  // Sync Juejin (only if no filter or filter includes juejin)
  const juejinUser = process.env.JUEJIN_USER_ID;
  if (juejinUser && (!allowedSources || allowedSources.has('juejin'))) {
    try {
      results.push(await syncJuejin(juejinUser));
    } catch (e) {
      results.push({ source: 'juejin', fetched: 0, imported: 0, skipped: 0, error: String(e) });
    }
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: 'No source configured (CSDN_USER_ID / JUEJIN_USER_ID)' },
      { status: 500 },
    );
  }

  const total = {
    imported: results.reduce((s, r) => s + r.imported, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
  };

  return NextResponse.json({ ok: true, results, ...total });
}
