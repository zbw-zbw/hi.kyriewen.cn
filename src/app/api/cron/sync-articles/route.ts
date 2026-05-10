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
  const cdataRe = new RegExp(
    `<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    'i',
  );
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
/*  Slug helper                                                        */
/* ------------------------------------------------------------------ */

/**
 * Generate a slug from the CSDN article URL.
 * URL format: https://blog.csdn.net/user/article/details/160866560
 */
function slugify(title: string, articleUrl: string): string {
  const idMatch = articleUrl.match(/\/details\/(\d+)/);
  const articleId = idMatch ? (idMatch[1] ?? '') : '';

  const englishParts = title
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const prefix =
    englishParts.length >= 3 ? englishParts.substring(0, 50) : 'csdn';
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
    return NextResponse.json(
      { error: 'CSDN_USER_ID not configured' },
      { status: 500 },
    );
  }

  try {
    // 1. Fetch RSS feed
    const rssUrl = `https://blog.csdn.net/${userId}/rss/list`;
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!rssRes.ok) {
      throw new Error(`RSS fetch failed: ${rssRes.status}`);
    }

    const rssXml = await rssRes.text();
    const articles = parseRssItems(rssXml);

    if (articles.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No articles found in RSS feed',
        fetched: 0,
        imported: 0,
        skipped: 0,
      });
    }

    // 2. Get existing CSDN source IDs to skip duplicates
    const existingPosts = await db
      .select({ sourceId: blogPosts.sourceId })
      .from(blogPosts)
      .where(eq(blogPosts.source, 'csdn'));

    const existingSourceIds = new Set(
      existingPosts.map((p) => p.sourceId).filter(Boolean),
    );

    let imported = 0;
    let skipped = 0;

    for (const article of articles) {
      const idMatch = article.link.match(/\/details\/(\d+)/);
      const articleId = idMatch?.[1] ?? '';

      if (!articleId) {
        skipped++;
        continue;
      }

      if (existingSourceIds.has(articleId)) {
        skipped++;
        continue;
      }

      // Store RSS summary as initial content.
      // Full content is backfilled via Admin panel (browser-side fetch
      // bypasses CSDN anti-scraping since it runs from a domestic IP).
      const slug = slugify(article.title, article.link);
      const publishedAt = article.pubDate
        ? new Date(article.pubDate)
        : new Date();

      await db.insert(blogPosts).values({
        slug,
        title: article.title,
        summary: article.description || null,
        content: article.description || '(Content pending backfill)',
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
