import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, likes } from '@/lib/db';
import type { LikeTargetType } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TYPES: LikeTargetType[] = ['message', 'post'];

/**
 * GET /api/likes?targetType=message&targetIds=1,2,3
 * 返回：
 *   - counts: { [targetId]: number }   每个目标的总点赞数
 *   - mine:   string[]                  当前用户已点赞的 targetId 列表（未登录则为 []）
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetType = url.searchParams.get('targetType') as LikeTargetType | null;
  const targetIdsParam = url.searchParams.get('targetIds') ?? '';

  if (!targetType || !VALID_TYPES.includes(targetType)) {
    return NextResponse.json({ error: 'invalid_target_type' }, { status: 400 });
  }

  const targetIds = targetIdsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (targetIds.length === 0) {
    return NextResponse.json({ counts: {}, mine: [] });
  }

  try {
    // 聚合每个 targetId 的点赞数
    const countRows = await db
      .select({
        targetId: likes.targetId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(
        and(eq(likes.targetType, targetType), inArray(likes.targetId, targetIds))
      )
      .groupBy(likes.targetId);

    const counts: Record<string, number> = {};
    for (const row of countRows) counts[row.targetId] = row.count;

    // 当前用户已点赞的列表
    let mine: string[] = [];
    const session = await auth().catch(() => null);
    if (session?.user?.id) {
      const mineRows = await db
        .select({ targetId: likes.targetId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, session.user.id),
            eq(likes.targetType, targetType),
            inArray(likes.targetId, targetIds)
          )
        );
      mine = mineRows.map((r) => r.targetId);
    }

    return NextResponse.json({ counts, mine });
  } catch (err) {
    console.error('[likes] GET error', err);
    return NextResponse.json({ counts: {}, mine: [], error: 'db_error' });
  }
}

/**
 * POST /api/likes  body: { targetType, targetId }
 * Toggle 行为：未点赞则 insert，已点赞则 delete。
 * 返回 { liked: boolean, count: number }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { targetType, targetId } = (await req.json().catch(() => ({}))) as {
    targetType?: LikeTargetType;
    targetId?: string;
  };

  if (!targetType || !VALID_TYPES.includes(targetType) || !targetId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const existing = await db
      .select({ id: likes.id })
      .from(likes)
      .where(
        and(
          eq(likes.userId, session.user.id),
          eq(likes.targetType, targetType),
          eq(likes.targetId, targetId)
        )
      )
      .limit(1);

    let liked: boolean;
    const existingRow = existing[0];
    if (existingRow) {
      await db.delete(likes).where(eq(likes.id, existingRow.id));
      liked = false;
    } else {
      await db.insert(likes).values({
        userId: session.user.id,
        targetType,
        targetId,
      });
      liked = true;
    }

    // 重新计数
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(likes)
      .where(
        and(eq(likes.targetType, targetType), eq(likes.targetId, targetId))
      );
    const count = countResult[0]?.count ?? 0;

    return NextResponse.json({ liked, count });
  } catch (err) {
    console.error('[likes] POST error', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
