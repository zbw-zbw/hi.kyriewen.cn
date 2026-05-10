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
 * Fetch article detail (with full markdown content) from Juejin API
 */
async function fetchArticleDetail(articleId: string): Promise<string> {
  try {
    const res = await fetch(
      'https://api.juejin.cn/content_api/v1/article/detail',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      }
    );
    if (!res.ok) return '';
    const data: JuejinDetailResponse = await res.json();
    if (data.err_no !== 0) return '';
    return data.data?.article_info?.mark_content || data.data?.article_info?.content || '';
  } catch {
    return '';
  }
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
      const content = await fetchArticleDetail(articleId);

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
