import { sql, inArray } from 'drizzle-orm';
import { db, pageViews } from '@/lib/db';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/views');

/** slug 会成为一行新记录，限制长度避免被用作写入放大器 */
const MAX_SLUG_LENGTH = 256;

/**
 * POST /api/views — 记录一次浏览（upsert）
 * Body: { slug: string }
 */
export async function POST(request: Request) {
  // 无鉴权的 upsert 端点，不限流就能被用来无成本灌满 page_views 表
  const limited = await enforceRateLimit('views', clientIp(request));
  if (limited) return limited;

  try {
    const { slug } = await request.json();
    if (!slug || typeof slug !== 'string') {
      return Response.json({ error: 'slug is required' }, { status: 400 });
    }
    if (slug.length > MAX_SLUG_LENGTH) {
      return Response.json({ error: 'slug too long' }, { status: 400 });
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
    log.error('post_failed', error);
    // 浏览量统计不应阻断页面，但也不能拿 200 掩盖故障
    return Response.json({ views: 0, error: 'db_unavailable' }, { status: 503 });
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
    log.error('get_failed', error);
    return Response.json({ views: {}, error: 'db_unavailable' }, { status: 503 });
  }
}
