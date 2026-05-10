#!/usr/bin/env node
/**
 * Backfill article content from CSDN & Juejin via Admin API.
 *
 * Flow: local fetch (domestic IP) → extract content → POST to Admin API (Vercel → Neon)
 *
 * Usage (on your personal computer):
 *   node scripts/backfill-csdn-content.mjs           # backfill all sources
 *   node scripts/backfill-csdn-content.mjs --csdn    # CSDN only
 *   node scripts/backfill-csdn-content.mjs --juejin  # Juejin only
 */

const ADMIN_API = 'https://admin.hi.kyriewen.cn';
const sourceArg = process.argv[2]; // --csdn or --juejin or undefined

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

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── CSDN content extractor ──────────────────────────────────────────
async function fetchCsdn(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const si = html.indexOf('id="content_views"');
  if (si === -1) return null;
  const gi = html.indexOf('>', si);
  let body = html.substring(gi + 1);
  for (const mk of ['class="article-copyright"', 'class="blog-tags-box"', 'class="article-bar-bottom"', 'id="article_bottom_area"', 'class="tool-box"', 'class="more-toolbox"']) {
    const idx = body.indexOf(mk);
    if (idx > 0) { let c = idx; while (c > 0 && body[c] !== '<') c--; body = body.substring(0, c); break; }
  }
  body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const md = toMd(body.trim());
  return md.length >= 50 ? md : null;
}

// ── Juejin content extractor ────────────────────────────────────────
async function fetchJuejin(url) {
  // url: https://juejin.cn/post/7490186940478570531
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Juejin SSR content is inside: class="article-viewer markdown-body result"
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

  // Cut at end markers
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
console.log(`Fetching articles from Admin API... ${sourceFilter || '(all sources)'}`);

const listRes = await fetch(`${ADMIN_API}/api/blog/backfill${queryParam}`);
if (!listRes.ok) {
  console.error(`❌ Failed to fetch article list: HTTP ${listRes.status}`);
  process.exit(1);
}
const { data: articles } = await listRes.json();
console.log(`Found ${articles.length} articles to backfill\n`);

let ok = 0, fail = 0, skip = 0;

for (const art of articles) {
  const idx = ok + fail + skip + 1;
  const label = `[${art.source}]`;
  process.stdout.write(`[${idx}/${articles.length}] ${label} ${art.title.slice(0, 40)}... `);

  if (!art.sourceUrl) { console.log('⏭️ no URL'); skip++; continue; }

  try {
    const md = await fetchContent(art.source, art.sourceUrl);
    if (!md) { console.log('⚠️ no content'); fail++; continue; }

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
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.log(`❌ ${e.message}`);
    fail++;
  }
}

console.log(`\n========================================`);
console.log(`Done! Updated: ${ok}, Failed: ${fail}, Skipped: ${skip}`);
