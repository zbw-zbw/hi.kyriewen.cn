#!/usr/bin/env node
/**
 * Backfill article full content from CSDN & Juejin.
 * Fetches articles with missing/short content via Admin API,
 * then scrapes the full content from each source.
 *
 * Usage:
 *   node scripts/backfill-articles.mjs           # all sources
 *   node scripts/backfill-articles.mjs --csdn    # CSDN only
 *   node scripts/backfill-articles.mjs --juejin  # Juejin only
 */

// Fix TLS certificate issues with Node.js 22+
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ADMIN_API = process.env.ADMIN_API || 'https://admin.kyriewen.cn';
const sourceArg = process.argv[2];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* ── HTML → Markdown ────────────────────────────────────────────── */

function strip(html) { return html.replace(/<[^>]+>/g, ''); }

function dec(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function toMd(html) {
  let md = html;
  md = md.replace(/<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, lang, code) => `\n\`\`\`${lang || ''}\n${dec(code.replace(/<[^>]+>/g, ''))}\n\`\`\`\n`);
  md = md.replace(/<h([1-5])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, c) => `\n${'#'.repeat(+n)} ${strip(c)}\n`);
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => {
    const s = strip(t).trim(); return s ? `[${s}](${h})` : '';
  });
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${dec(c)}\``);
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${strip(c).trim()}\n`);
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, c) => strip(c).trim().split('\n').map(l => `> ${l}`).join('\n') + '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `\n${strip(c).trim()}\n`);
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = dec(md);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

/* ── Retry wrapper ──────────────────────────────────────────────── */

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 403 || res.status === 429) {
        await new Promise(r => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return null;
}

/* ── CSDN content extractor ─────────────────────────────────────── */

async function fetchCsdn(url) {
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' },
  });
  if (!res || !res.ok) return null;
  const html = await res.text();
  const startIdx = html.indexOf('id="content_views"');
  if (startIdx === -1) return null;
  const tagEnd = html.indexOf('>', startIdx);
  let body = html.substring(tagEnd + 1);

  const endMarkers = [
    'id="treeSkill"', 'class="hide-article-box"', 'class="article-copyright"',
    'class="blog-tags-box"', 'class="article-bar-bottom"', 'id="article_bottom_area"',
    'class="tool-box"', 'class="more-toolbox"', 'class="recommend-box"',
    'class="template-box"', 'class="blog-footer-bottom"', 'class="csdn-side-toolbar"',
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
  body = body.replace(/<div class="[^"]*csdn-toolbar[^"]*"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<div[^>]*id="[^"]*recommend[^"]*"[\s\S]*$/gi, '');
  body = body.replace(/<div[^>]*class="[^"]*recommend[^"]*"[\s\S]*$/gi, '');

  const md = toMd(body.trim());
  return md.length >= 50 ? md : null;
}

/* ── Juejin content extractor (fetch SSR HTML + parse) ────────── */

async function fetchJuejin(url) {
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res || !res.ok) return null;
  const html = await res.text();

  // Extract content from SSR-rendered article-viewer div
  const startMarker = 'class="article-viewer markdown-body result">';
  const si = html.indexOf(startMarker);
  if (si === -1) return null;

  let body = html.substring(si + startMarker.length);

  // Skip leading <style> tags
  while (body.trimStart().startsWith('<style')) {
    const se = body.indexOf('</style>');
    if (se === -1) break;
    body = body.substring(se + 8);
  }

  // Cut at end markers
  for (const mk of [
    'class="tag-list-box"',
    'class="article-end"',
    'class="article-suspended-panel"',
    'class="recommended-area"',
  ]) {
    const idx = body.indexOf(mk);
    if (idx > 0) {
      let c = idx;
      while (c > 0 && body[c] !== '<') c--;
      body = body.substring(0, c);
      break;
    }
  }

  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const md = toMd(body.trim());
  return md.length >= 50 ? md : null;
}

/* ── Content dispatcher ─────────────────────────────────────────── */

function fetchContent(source, url) {
  if (source === 'csdn') return fetchCsdn(url);
  if (source === 'juejin') return fetchJuejin(url);
  return null;
}

/* ── Main ───────────────────────────────────────────────────────── */

const sourceFilter = sourceArg === '--csdn' ? 'csdn' : sourceArg === '--juejin' ? 'juejin' : '';
const queryParam = sourceFilter ? `?source=${sourceFilter}` : '';
console.log(`Fetching articles from Admin API (${ADMIN_API})...`);
console.log(`Source filter: ${sourceFilter || 'all'}\n`);

let listRes;
try {
  listRes = await fetch(`${ADMIN_API}/api/blog/backfill${queryParam}`);
} catch (error) {
  console.error(`❌ Failed to connect to Admin API: ${error.message}`);
  console.error(`   Make sure ADMIN_API is set correctly (current: ${ADMIN_API})`);
  process.exit(1);
}

if (!listRes.ok) {
  console.error(`❌ Failed to fetch article list: HTTP ${listRes.status}`);
  process.exit(1);
}

const { data: articles } = await listRes.json();
console.log(`Found ${articles.length} articles to backfill\n`);

if (articles.length === 0) {
  console.log('✅ All articles already have content. Nothing to do.');
  process.exit(0);
}

let successCount = 0, failCount = 0, skipCount = 0;
const failedArticles = [];

for (const art of articles) {
  const idx = successCount + failCount + skipCount + 1;
  process.stdout.write(`[${idx}/${articles.length}] [${art.source}] ${art.title.slice(0, 50)}... `);

  if (!art.sourceUrl) {
    console.log('⏭️ no URL');
    skipCount++;
    continue;
  }

  try {
    const markdown = await fetchContent(art.source, art.sourceUrl);
    if (!markdown) {
      console.log('⚠️ no content');
      failedArticles.push(art);
      failCount++;
      continue;
    }

    const updateRes = await fetch(`${ADMIN_API}/api/blog/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: art.id, content: markdown }),
    });

    if (!updateRes.ok) {
      console.log(`❌ API ${updateRes.status}`);
      failCount++;
      continue;
    }

    console.log(`✅ ${markdown.length} chars`);
    successCount++;

    // Rate limiting: 3s + random jitter
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
  } catch (error) {
    console.log(`❌ ${error.message}`);
    failedArticles.push(art);
    failCount++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Done! ✅ ${successCount} updated, ❌ ${failCount} failed, ⏭️ ${skipCount} skipped`);

if (failedArticles.length > 0) {
  console.log(`\nFailed articles (can retry later):`);
  for (const article of failedArticles) {
    console.log(`  [${article.source}] ${article.title}`);
  }
}
