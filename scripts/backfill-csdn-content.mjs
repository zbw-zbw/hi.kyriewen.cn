#!/usr/bin/env node
/**
 * Backfill article content from CSDN & Juejin via Admin API.
 *
 * Usage:
 *   node scripts/backfill-csdn-content.mjs           # all sources
 *   node scripts/backfill-csdn-content.mjs --csdn    # CSDN only
 *   node scripts/backfill-csdn-content.mjs --juejin  # Juejin only
 */

const ADMIN_API = 'https://admin.kyriewen.cn';
const sourceArg = process.argv[2];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── HTML → Markdown ──────────────────────────────────────────────────
function strip(h) { return h.replace(/<[^>]+>/g, ''); }
function dec(t) {
  return t
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
function toMd(html) {
  let m = html;
  m = m.replace(/<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, l, c) => `\n\`\`\`${l || ''}\n${dec(c.replace(/<[^>]+>/g, ''))}\n\`\`\`\n`);
  m = m.replace(/<h([1-5])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, c) => `\n${'#'.repeat(+n)} ${strip(c)}\n`);
  m = m.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  m = m.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  m = m.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => { const s = strip(t).trim(); return s ? `[${s}](${h})` : ''; });
  m = m.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  m = m.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  m = m.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  m = m.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${dec(c)}\``);
  m = m.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${strip(c).trim()}\n`);
  m = m.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => strip(c).trim().split('\n').map(l => `> ${l}`).join('\n') + '\n');
  m = m.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `\n${strip(c).trim()}\n`);
  m = m.replace(/<hr[^>]*\/?>/gi, '\n---\n');
  m = m.replace(/<br[^>]*\/?>/gi, '\n');
  m = m.replace(/<[^>]+>/g, '');
  m = dec(m);
  m = m.replace(/\n{3,}/g, '\n\n').trim();
  return m;
}

// ── Retry wrapper ───────────────────────────────────────────────────
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 403 || res.status === 429) {
        // Rate limited, wait longer
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

// ── CSDN content extractor (improved) ───────────────────────────────
async function fetchCsdn(url) {
  const res = await fetchWithRetry(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' } });
  if (!res || !res.ok) return null;
  const html = await res.text();
  const si = html.indexOf('id="content_views"');
  if (si === -1) return null;
  const gi = html.indexOf('>', si);
  let body = html.substring(gi + 1);

  // Improved: find the closing </div> by tracking nesting depth from content_views
  // First try precise end markers (ordered by priority)
  const endMarkers = [
    'id="treeSkill"',
    'class="hide-article-box"',
    'class="article-copyright"',
    'class="blog-tags-box"',
    'class="article-bar-bottom"',
    'id="article_bottom_area"',
    'class="tool-box"',
    'class="more-toolbox"',
    'class="recommend-box"',
    'class="template-box"',
    'id="blogColumnPayAd498498"',
    'class="blog-footer-bottom"',
    'class="csdn-side-toolbar"',
  ];

  for (const mk of endMarkers) {
    const idx = body.indexOf(mk);
    if (idx > 0) {
      let c = idx;
      while (c > 0 && body[c] !== '<') c--;
      body = body.substring(0, c);
      break;
    }
  }

  // Clean up unwanted elements
  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  body = body.replace(/<div class="[^"]*csdn-toolbar[^"]*"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<div[^>]*id="[^"]*recommend[^"]*"[\s\S]*$/gi, '');
  body = body.replace(/<div[^>]*class="[^"]*recommend[^"]*"[\s\S]*$/gi, '');

  const md = toMd(body.trim());
  return md.length >= 50 ? md : null;
}

// ── Juejin content extractor ────────────────────────────────────────
async function fetchJuejin(url) {
  const res = await fetchWithRetry(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
  });
  if (!res || !res.ok) return null;
  const html = await res.text();

  const startMarker = 'class="article-viewer markdown-body result">';
  let si = html.indexOf(startMarker);
  if (si === -1) return null;
  let body = html.substring(si + startMarker.length);

  // Skip <style> tags
  while (body.trimStart().startsWith('<style')) {
    const se = body.indexOf('</style>');
    if (se === -1) break;
    body = body.substring(se + 8);
  }

  for (const mk of ['class="tag-list-box"', 'class="article-end"', 'class="article-suspended-panel"', 'class="recommended-area"']) {
    const idx = body.indexOf(mk);
    if (idx > 0) { let c = idx; while (c > 0 && body[c] !== '<') c--; body = body.substring(0, c); break; }
  }

  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const md = toMd(body.trim());
  return md.length >= 50 ? md : null;
}

// ── Content dispatcher ──────────────────────────────────────────────
async function fetchContent(source, url) {
  if (source === 'csdn') return fetchCsdn(url);
  if (source === 'juejin') return fetchJuejin(url);
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────
const sourceFilter = sourceArg === '--csdn' ? 'csdn' : sourceArg === '--juejin' ? 'juejin' : '';
const queryParam = sourceFilter ? `?source=${sourceFilter}` : '';
console.log(`Fetching articles from Admin API... ${sourceFilter || '(all sources)'}\n`);

const listRes = await fetch(`${ADMIN_API}/api/blog/backfill${queryParam}`);
if (!listRes.ok) {
  console.error(`❌ Failed to fetch article list: HTTP ${listRes.status}`);
  process.exit(1);
}
const { data: articles } = await listRes.json();
console.log(`Found ${articles.length} articles to backfill\n`);

let ok = 0, fail = 0, skip = 0;
const failed = [];

for (const art of articles) {
  const idx = ok + fail + skip + 1;
  process.stdout.write(`[${idx}/${articles.length}] [${art.source}] ${art.title.slice(0, 40)}... `);

  if (!art.sourceUrl) { console.log('⏭️ no URL'); skip++; continue; }

  try {
    const md = await fetchContent(art.source, art.sourceUrl);
    if (!md) {
      console.log('⚠️ no content');
      failed.push({ id: art.id, title: art.title, source: art.source, url: art.sourceUrl });
      fail++;
      continue;
    }

    const updateRes = await fetch(`${ADMIN_API}/api/blog/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: art.id, content: md }),
    });

    if (!updateRes.ok) {
      console.log(`❌ API ${updateRes.status}`);
      fail++;
      continue;
    }

    console.log(`✅ ${md.length} chars`);
    ok++;

    // Longer delay to avoid rate limiting (3s + random 0-2s jitter)
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed.push({ id: art.id, title: art.title, source: art.source, url: art.sourceUrl });
    fail++;
  }
}

console.log(`\n========================================`);
console.log(`Done! Updated: ${ok}, Failed: ${fail}, Skipped: ${skip}`);

if (failed.length > 0) {
  console.log(`\nFailed articles (can retry later):`);
  for (const f of failed) {
    console.log(`  [${f.source}] ${f.title}`);
  }
}
