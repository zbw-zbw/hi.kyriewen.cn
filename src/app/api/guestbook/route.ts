import { NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, guestbookMessages } from '@/lib/db';
import { getRateLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/guestbook?postSlug=xxx
 * - postSlug 不传：返回留言墙（postSlug IS NULL）的全部留言（含子回复）
 * - postSlug 传值：返回该篇博客的全部评论（含子回复）
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const postSlugParam = url.searchParams.get('postSlug');

  try {
    const condition = postSlugParam
      ? eq(guestbookMessages.postSlug, postSlugParam)
      : isNull(guestbookMessages.postSlug);

    const messages = await db
      .select()
      .from(guestbookMessages)
      .where(condition)
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(200);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[guestbook] list error', err);
    return NextResponse.json({ messages: [], error: 'db_unavailable' });
  }
}

/**
 * POST /api/guestbook  body: { body, parentId?, postSlug? }
 * - parentId：楼中楼父留言 id（可选）
 * - postSlug：博客评论场景的 slug（可选）
 * 校验：
 *   - 若 parentId 存在，必须确保父留言存在，且 postSlug 与父一致（不能跨场景回复）
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { body, parentId, postSlug } = (await req.json().catch(() => ({}))) as {
    body?: string;
    parentId?: number | null;
    postSlug?: string | null;
  };

  const trimmed = body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }
  if (trimmed.length > 1000) {
    return NextResponse.json({ error: 'too_long' }, { status: 400 });
  }

  // 限流：每用户 60s 一条
  const limiter = getRateLimiter();
  if (limiter) {
    const { success } = await limiter.limit(session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  }

  // 校验 parentId 与 postSlug 一致性
  if (parentId) {
    try {
      const [parent] = await db
        .select({ postSlug: guestbookMessages.postSlug })
        .from(guestbookMessages)
        .where(eq(guestbookMessages.id, parentId))
        .limit(1);

      if (!parent) {
        return NextResponse.json({ error: 'parent_not_found' }, { status: 400 });
      }
      const parentSlug = parent.postSlug ?? null;
      const requestSlug = postSlug ?? null;
      if (parentSlug !== requestSlug) {
        return NextResponse.json(
          { error: 'parent_scope_mismatch' },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('[guestbook] parent check error', err);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
  }

  try {
    const [row] = await db
      .insert(guestbookMessages)
      .values({
        userId: session.user.id,
        name: session.user.name ?? session.user.login ?? 'anonymous',
        avatar: session.user.image ?? null,
        body: trimmed,
        parentId: parentId ?? null,
        postSlug: postSlug ?? null,
      })
      .returning();
    return NextResponse.json({ message: row });
  } catch (err) {
    console.error('[guestbook] insert error', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

// 让 lint 不报 `and` 未使用（保留导入，便于将来拓展条件查询）
void and;
