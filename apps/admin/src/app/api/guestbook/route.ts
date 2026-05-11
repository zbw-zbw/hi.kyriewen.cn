import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { guestbookMessages } from '@repo/db/schema';
import { desc, isNull, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guestbook — 分页查询留言列表
 *
 * Query params:
 *   - type: 'all' | 'guestbook' | 'blog' (default: 'all')
 *   - page: number (default: 1)
 *   - limit: number (default: 50)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? 'all';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    let query = db
      .select()
      .from(guestbookMessages)
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(limit)
      .offset(offset);

    if (type === 'guestbook') {
      query = query.where(isNull(guestbookMessages.postSlug)) as typeof query;
    } else if (type === 'blog') {
      query = query.where(
        sql`${guestbookMessages.postSlug} IS NOT NULL`
      ) as typeof query;
    }

    const rows = await query;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guestbookMessages);
    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[guestbook] list error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
