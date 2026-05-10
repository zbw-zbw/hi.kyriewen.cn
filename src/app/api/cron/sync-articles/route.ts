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

/* ------------------------------------------------------------------ */
/*  RSS parsing helpers                                                */
/* ------------------------------------------------------------------ */

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

/**
 * Parse CSDN RSS XML and extract items.
 * CSDN wraps text in CDATA sections: <![CDATA[...]]>
 */
function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] ?? '';
    const title = extractCdata(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const description = extractCdata(block, 'description');

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }
  return items;
}

/** Extract CDATA or plain text from an XML tag */
function extractCdata(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return (cdataMatch[1] ?? '').trim();
  return extractTag(xml, tag);
}

/** Extract plain text content from an XML tag */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const m = re.exec(xml);
  return m ? (m[1] ?? '').trim() : '';
}

/* ------------------------------------------------------------------ */
/*  Article content fetching                                           */
/* ------------------------------------------------------------------ */

/**
 * Fetch full article content from CSDN article page.
 * The content lives inside `<div id="content_views" class="markdown_views ...">`.
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return '';
    const html = await res.text();

    // Locate the content_views container
    const startMarker = 'id="content_views"';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) return '';

    // Find the opening > after the id attribute
    const gtIdx = html.indexOf('>', startIdx);
    if (gtIdx === -1) return '';

    let body = html.substring(gtIdx + 1);

    // Find the closing </div> that matches content_views depth
    // We look for common markers that follow the article content
    const endMarkers = [
      'class="article-copyright"',
      'class="blog-tags-box"',
      'class="article-bar-bottom"',
      'id="article_bottom_area"',
      'class="tool-box"',
      'class="more-toolbox"',
    ];

    for (const marker of endMarkers) {
      const idx = body.indexOf(marker);
      if (idx > 0) {
        // Walk back to find the opening < of this element
        let cutoff = idx;
        while (cutoff > 0 && body[cutoff] !== '<') cutoff--;
        body = body.substring(0, cutoff);
        break;
      }
    }

    // Remove SVG elements (CSDN adds inline SVG markers)
    body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');

    return htmlToMarkdown(body.trim());
  } catch (e) {
    console.error('[sync-articles] Failed to fetch content from', url, e);
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  HTML → Markdown converter                                          */
/* ------------------------------------------------------------------ */

function htmlToMarkdown(html: string): string {
  let md = html;

  // Code blocks: <pre><code class="... language-xxx">...</code></pre>
  md = md.replace(
    /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_m, lang, code) => {
      const decoded = decodeEntities(code.replace(/<[^>]+>/g, ''));
      return `\n\`\`\`${lang || ''}\n${decoded}\n\`\`\`\n`;
    },
  );

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n# ${strip(c)}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n## ${strip(c)}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n### ${strip(c)}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n#### ${strip(c)}\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_m, c) => `\n##### ${strip(c)}\n`);

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
    const t = strip(text).trim();
    return t ? `[${t}](${href})` : '';
  });

  // Bold & italic
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${decodeEntities(c)}\``);

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `- ${strip(c).trim()}\n`);

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => {
    return (
      strip(c)
        .trim()
        .split('\n')
        .map((l: string) => `> ${l}`)
        .join('\n') + '\n'
    );
  });

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n${strip(c).trim()}\n`);

  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Line breaks
  md = md.replace(/<br[^>]*\/?>/gi, '\n');

  // Tables (basic support)
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, table) => {
    const rows: string[] = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    let isFirst = true;
    while ((rowMatch = rowRe.exec(table)) !== null) {
      const cells: string[] = [];
      const cellRe = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRe.exec(rowMatch[1] ?? '')) !== null) {
        cells.push(strip(cellMatch[1] ?? '').trim());
      }
      if (cells.length > 0) {
        rows.push(`| ${cells.join(' | ')} |`);
        if (isFirst) {
          rows.push(`| ${cells.map(() => '---').join(' | ')} |`);
          isFirst = false;
        }
      }
    }
    return rows.length > 0 ? `\n${rows.join('\n')}\n` : '';
  });

  // Remove remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities (CSDN uses &#xNNNN; format heavily)
  md = decodeEntities(md);

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Slug & helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generate a slug from the CSDN article URL.
 * URL format: https://blog.csdn.net/user/article/details/160866560
 * → slug: csdn-160866560
 */
function slugify(title: string, articleUrl: string): string {
  // Extract the numeric article ID from CSDN URL
  const idMatch = articleUrl.match(/\/details\/(\d+)/);
  const articleId = idMatch ? (idMatch[1] ?? '') : '';

  // Try to build a readable prefix from the title
  const englishParts = title
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const prefix = englishParts.length >= 3 ? englishParts.substring(0, 50) : 'csdn';
  return `${prefix}-${articleId}`;
}

/* ------------------------------------------------------------------ */
/*  GET handler – Cron entry point                                     */
/* ------------------------------------------------------------------ */

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.CSDN_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'CSDN_USER_ID not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch RSS feed
    const rssUrl = `https://blog.csdn.net/${userId}/rss/list`;
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!rssRes.ok) {
      throw new Error(`RSS fetch failed: ${rssRes.status} ${rssRes.statusText}`);
    }

    const rssXml = await rssRes.text();
    const articles = parseRssItems(rssXml);

    if (articles.length === 0) {
      return NextResponse.json({ ok: true, message: 'No articles found in RSS feed', fetched: 0, imported: 0, skipped: 0 });
    }

    // 2. Get existing CSDN source IDs to skip duplicates
    const existingPosts = await db
      .select({ sourceId: blogPosts.sourceId })
      .from(blogPosts)
      .where(eq(blogPosts.source, 'csdn'));

    const existingSourceIds = new Set(existingPosts.map((p) => p.sourceId).filter(Boolean));

    let imported = 0;
    let skipped = 0;

    for (const article of articles) {
      // Extract article ID from URL
      const idMatch = article.link.match(/\/details\/(\d+)/);
      const articleId = idMatch?.[1] ?? '';

      if (!articleId) {
        skipped++;
        continue;
      }

      // Skip if already imported
      if (existingSourceIds.has(articleId)) {
        skipped++;
        continue;
      }

      // 3. Fetch full article content
      const content = await fetchArticleContent(article.link);

      const slug = slugify(article.title, article.link);
      const publishedAt = article.pubDate ? new Date(article.pubDate) : new Date();

      await db.insert(blogPosts).values({
        slug,
        title: article.title,
        summary: article.description || null,
        content: content || '(Content not available)',
        tags: '[]',
        lang: 'zh',
        draft: 1,
        coverImage: null,
        source: 'csdn',
        sourceId: articleId,
        sourceUrl: article.link,
        publishedAt,
      });

      imported++;

      // Rate limiting: small delay every 5 articles
      if (imported % 5 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: articles.length,
      imported,
      skipped,
      message: `Synced ${imported} new articles from CSDN (${skipped} already existed)`,
    });
  } catch (error) {
    console.error('[sync-articles] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync articles from CSDN',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
