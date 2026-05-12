import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

const PORT = Number(process.env.PORT ?? 3100);
const PROXY_SECRET = process.env.PROXY_SECRET ?? '';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* ── Auth middleware ─────────────────────────────────────────────── */

app.use('/api/*', async (c, next) => {
  if (PROXY_SECRET) {
    const auth = c.req.header('Authorization');
    if (auth !== `Bearer ${PROXY_SECRET}`) {
      return c.json({ ok: false, error: 'Unauthorized' }, 401);
    }
  }
  await next();
});

/* ── HTML → Markdown helpers ─────────────────────────────────────── */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(parseInt(d, 10)))
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
    (_, lang: string, code: string) =>
      `\n\`\`\`${lang || ''}\n${decodeEntities(code.replace(/<[^>]+>/g, ''))}\n\`\`\`\n`,
  );
  md = md.replace(
    /<h([1-5])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, n: string, c: string) => `\n${'#'.repeat(+n)} ${stripTags(c)}\n`,
  );
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  md = md.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, text: string) => {
      const clean = stripTags(text).trim();
      return clean ? `[${clean}](${href})` : '';
    },
  );
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c: string) =>
    c
      .split('\n')
      .map((l: string) => `> ${stripTags(l).trim()}`)
      .filter((l: string) => l.trim() !== '>')
      .join('\n'),
  );
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c: string) => `- ${stripTags(c).trim()}\n`);
  md = md.replace(/<\/?(?:ul|ol|div|p|span|section|article|br\s*\/?)[^>]*>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = decodeEntities(md);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

/* ── Retry wrapper ───────────────────────────────────────────────── */

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  retries = 3,
): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
      if (res.ok) return res;
      if (res.status === 403 || res.status === 429) {
        const delay = 2000 * Math.pow(2, i) + Math.random() * 1000;
        console.log(`[retry] ${url} → ${res.status}, waiting ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return null;
    } catch (e) {
      if (i < retries - 1) {
        const delay = 2000 * Math.pow(2, i);
        console.log(`[retry] ${url} → error, waiting ${delay}ms`, e);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return null;
}

/* ── CSDN content fetcher ────────────────────────────────────────── */

async function fetchCsdnContent(articleUrl: string): Promise<string | null> {
  const res = await fetchWithRetry(articleUrl, {
    headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
  });
  if (!res) return null;
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
    'class="csdn-toolbar"',
    'class="recommend-box"',
    'class="more-toolbox"',
    'class="person-messagebox"',
    'id="recommendAd498"',
    'class="template-box"',
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
}

/* ── Juejin content fetcher ──────────────────────────────────────── */

async function fetchJuejinContent(articleId: string): Promise<string | null> {
  const res = await fetchWithRetry('https://api.juejin.cn/content_api/v1/article/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ article_id: articleId }),
  });
  if (!res) return null;
  const data = await res.json();
  const markdownBody = data?.data?.article_info?.mark_content;
  if (markdownBody && markdownBody.length >= 50) return markdownBody;
  return null;
}

/* ── POST /api/fetch-content ─────────────────────────────────────── */

app.post('/api/fetch-content', async (c) => {
  const body = await c.req.json<{
    source: 'csdn' | 'juejin';
    url?: string;
    articleId?: string;
  }>();

  const { source, url, articleId } = body;

  if (!source || !['csdn', 'juejin'].includes(source)) {
    return c.json({ ok: false, error: 'Invalid source, must be "csdn" or "juejin"' }, 400);
  }

  let content: string | null = null;

  if (source === 'csdn') {
    if (!url) return c.json({ ok: false, error: 'url is required for csdn' }, 400);
    console.log(`[csdn] Fetching content: ${url}`);
    content = await fetchCsdnContent(url);
  } else {
    const id = articleId ?? url?.match(/post\/(\d+)/)?.[1];
    if (!id) return c.json({ ok: false, error: 'articleId or url is required for juejin' }, 400);
    console.log(`[juejin] Fetching content: ${id}`);
    content = await fetchJuejinContent(id);
  }

  if (!content) {
    return c.json({ ok: false, error: `Failed to fetch ${source} content` }, 502);
  }

  return c.json({ ok: true, content, length: content.length });
});

/* ── Health check ────────────────────────────────────────────────── */

app.get('/health', (c) => c.json({ ok: true, uptime: process.uptime() }));

/* ── Start server ────────────────────────────────────────────────── */

console.log(`🚀 Content proxy listening on port ${PORT}`);
serve({ fetch: app.fetch, port: PORT });
