#!/usr/bin/env node
/**
 * Backfill CSDN article content via Admin API.
 *
 * Flow: local fetch CSDN (domestic IP) → POST to Admin API (Vercel) → write to Neon DB
 *
 * Usage (on your personal computer, NOT company network):
 *   node scripts/backfill-csdn-content.mjs
 */

const ADMIN_API = 'https://admin.hi.kyriewen.cn';

// ── HTML → Markdown helpers ──────────────────────────────────────────
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

// ── Fetch article content from CSDN page ────────────────────────────
async function fetchContent(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
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

// ── Main ─────────────────────────────────────────────────────────────
console.log('Fetching CSDN articles from Admin API...');

const listRes = await fetch(`${ADMIN_API}/api/blog/backfill`);
if (!listRes.ok) {
  console.error(`❌ Failed to fetch article list: HTTP ${listRes.status}`);
  process.exit(1);
}
const { data: articles } = await listRes.json();
console.log(`Found ${articles.length} CSDN articles\n`);

let ok = 0, fail = 0, skip = 0;

for (const art of articles) {
  process.stdout.write(`[${ok + fail + skip + 1}/${articles.length}] ${art.title.slice(0, 45)}... `);

  if (!art.sourceUrl) { console.log('⏭️ no sourceUrl'); skip++; continue; }

  try {
    const md = await fetchContent(art.sourceUrl);
    if (!md) { console.log('⚠️ no content extracted'); fail++; continue; }

    // POST content to Admin API
    const updateRes = await fetch(`${ADMIN_API}/api/blog/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: art.id, content: md }),
    });

    if (!updateRes.ok) {
      console.log(`❌ API error: HTTP ${updateRes.status}`);
      fail++;
      continue;
    }

    console.log(`✅ ${md.length} chars`);
    ok++;

    // Rate limit to avoid CSDN blocking
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.log(`❌ ${e.message}`);
    fail++;
  }
}

console.log(`\n========================================`);
console.log(`Done! Updated: ${ok}, Failed: ${fail}, Skipped: ${skip}`);
