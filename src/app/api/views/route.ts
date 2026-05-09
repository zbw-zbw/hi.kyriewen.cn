import { sql, inArray } from 'drizzle-orm';
import { db, pageViews } from '@/lib/db';

/**
 * POST /api/views — 记录一次浏览（upsert）
 * Body: { slug: string }
 */
export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    if (!slug || typeof slug !== 'string') {
      return Response.json({ error: 'slug is required' }, { status: 400 });
    }

    const result = await db
      .insert(pageViews)
      .values({ slug, views: 1 })
      .onConflictDoUpdate({
        target: pageViews.slug,
        set: {
          views: sql`${pageViews.views} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ views: pageViews.views });

    return Response.json({ views: result[0]?.views ?? 1 });
  } catch (error) {
    console.error('[api/views] POST failed', error);
    return Response.json({ views: 0 }, { status: 200 });
  }
}

/**
 * GET /api/views?slugs=blog/post1,blog/post2 — 批量查询浏览量
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugsParam = searchParams.get('slugs');

    if (!slugsParam) {
      return Response.json({ views: {} });
    }

    const slugList = slugsParam.split(',').filter(Boolean);
    if (slugList.length === 0) {
      return Response.json({ views: {} });
    }

    const rows = await db
      .select({ slug: pageViews.slug, views: pageViews.views })
      .from(pageViews)
      .where(inArray(pageViews.slug, slugList));

    const viewsMap: Record<string, number> = {};
    for (const row of rows) {
      viewsMap[row.slug] = row.views;
    }

    return Response.json({ views: viewsMap });
  } catch (error) {
    console.error('[api/views] GET failed', error);
    return Response.json({ views: {} }, { status: 200 });
  }
}
