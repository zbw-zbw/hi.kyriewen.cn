import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

interface JuejinArticle {
  article_id: string;
  article_info: {
    article_id: string;
    title: string;
    brief_content: string;
    cover_image: string;
    content: string;
    mark_content: string;
    ctime: string;
    mtime: string;
    tag_ids: string[];
  };
  tags: Array<{ tag_name: string }>;
}

interface JuejinResponse {
  err_no: number;
  err_msg: string;
  data: JuejinArticle[];
  cursor: string;
  count: number;
  has_more: boolean;
}

interface JuejinDetailResponse {
  err_no: number;
  err_msg: string;
  data: {
    article_id: string;
    article_info: {
      article_id: string;
      mark_content: string;
      content: string;
    };
  };
}

/**
 * Generate a readable slug from article title.
 * For Chinese titles, extract English/number parts + use article ID suffix.
 */
function slugify(title: string, articleId: string): string {
  // Extract English words and numbers from the title
  const englishParts = title
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Use english parts if available, otherwise use "juejin" prefix
  const prefix = englishParts.length >= 3 ? englishParts.substring(0, 60) : 'juejin';
  // Always append short article ID for uniqueness
  return `${prefix}-${articleId.slice(-8)}`;
}

/**
 * Fetch article content by scraping the Juejin article page.
 * The detail API (/article/detail) has anti-scraping restrictions,
 * so we extract content from the SSR-rendered HTML page instead.
 * The page contains an `article-viewer markdown-body result` div with the rendered HTML.
 * We convert it back to simplified Markdown.
 */
async function fetchArticleContent(articleId: string): Promise<string> {
  try {
    const res = await fetch(`https://juejin.cn/post/${articleId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return '';
    const html = await res.text();

    // Extract the markdown-body div content
    const startMarker = 'class="article-viewer markdown-body result">';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) return '';

    let body = html.substring(startIdx + startMarker.length);

    // Skip <style> tags at the beginning
    while (body.trimStart().startsWith('<style')) {
      const styleEnd = body.indexOf('</style>');
      if (styleEnd === -1) break;
      body = body.substring(styleEnd + 8);
    }

    // Find end of article content (before tag-list, article-end, etc.)
    for (const marker of [
      'class="tag-list-box"',
      'class="article-end"',
      'class="article-suspended-panel"',
      'class="recommended-area"',
    ]) {
      const idx = body.indexOf(marker);
      if (idx > 0) {
        // Go back to find the opening < of this div
        let cutoff = idx;
        while (cutoff > 0 && body[cutoff] !== '<') cutoff--;
        body = body.substring(0, cutoff);
        break;
      }
    }

    // Convert HTML to simplified Markdown
    return htmlToSimpleMarkdown(body.trim());
  } catch {
    return '';
  }
}

/**
 * Very simple HTML→Markdown converter for Juejin article content.
 * Handles headings, paragraphs, code blocks, lists, images, links, bold, italic.
 */
function htmlToSimpleMarkdown(html: string): string {
  let md = html;

  // Code blocks: <pre><code class="hljs language-xxx">...</code></pre>
  md = md.replace(
    /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_m, lang, code) => {
      const decoded = decodeHtmlEntities(code.replace(/<[^>]+>/g, ''));
      return `\n\`\`\`${lang || ''}\n${decoded}\n\`\`\`\n`;
    }
  );

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n# ${stripTags(c)}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n## ${stripTags(c)}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n### ${stripTags(c)}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n#### ${stripTags(c)}\n`);

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => `[${stripTags(text)}](${href})`);

  // Bold
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

  // Italic
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${decodeHtmlEntities(c)}\``);

  // List items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `- ${stripTags(c).trim()}\n`);

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => {
    return stripTags(c).trim().split('\n').map((l: string) => `> ${l}`).join('\n') + '\n';
  });

  // Paragraphs → double newline
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n${stripTags(c).trim()}\n`);

  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Line breaks
  md = md.replace(/<br[^>]*\/?>/gi, '\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = decodeHtmlEntities(md);

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.JUEJIN_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: 'JUEJIN_USER_ID not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch articles from Juejin API
    const articles: JuejinArticle[] = [];
    let cursor = '0';
    let hasMore = true;
    let page = 0;
    const MAX_PAGES = 5; // Limit to avoid too many requests

    while (hasMore && page < MAX_PAGES) {
      const res = await fetch(
        'https://api.juejin.cn/content_api/v1/article/query_list',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            sort_type: 2, // by created time
            cursor,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Juejin API error: ${res.status} ${res.statusText}`);
      }

      const data: JuejinResponse = await res.json();

      if (data.err_no !== 0) {
        throw new Error(`Juejin API error: ${data.err_msg}`);
      }

      articles.push(...(data.data || []));
      cursor = data.cursor;
      hasMore = data.has_more;
      page++;
    }

    // Get existing source IDs to avoid duplicates
    const existingPosts = await db
      .select({ sourceId: blogPosts.sourceId })
      .from(blogPosts)
      .where(eq(blogPosts.source, 'juejin'));

    const existingSourceIds = new Set(
      existingPosts.map((p) => p.sourceId).filter(Boolean)
    );

    let imported = 0;
    let skipped = 0;

    for (const article of articles) {
      const articleId = article.article_info.article_id;

      // Skip if already imported
      if (existingSourceIds.has(articleId)) {
        skipped++;
        continue;
      }

      const title = article.article_info.title;
      const summary = article.article_info.brief_content;
      const coverImage = article.article_info.cover_image || null;
      const tags = JSON.stringify(
        (article.tags || []).map((t) => t.tag_name)
      );
      const publishedAt = new Date(
        parseInt(article.article_info.ctime, 10) * 1000
      );

      // Fetch full article content via detail API
      // (query_list API does NOT return article body)
      const content = await fetchArticleContent(articleId);

      const slug = slugify(title, articleId);

      await db.insert(blogPosts).values({
        slug,
        title,
        summary: summary || null,
        content: content || '(Content not available)',
        tags,
        lang: 'zh',
        draft: 1, // Import as draft for human review
        coverImage,
        source: 'juejin',
        sourceId: articleId,
        sourceUrl: `https://juejin.cn/post/${articleId}`,
        publishedAt,
      });

      imported++;

      // Small delay to avoid rate limiting
      if (imported % 10 === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: articles.length,
      imported,
      skipped,
      message: `Synced ${imported} new articles from Juejin (${skipped} already existed)`,
    });
  } catch (error) {
    console.error('[sync-articles] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync articles',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
