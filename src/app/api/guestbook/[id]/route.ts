import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, guestbookMessages } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/guestbook/[id]  body: { body: string }
 * 仅作者本人可编辑；自动写 updatedAt。
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  const trimmed = body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }
  if (trimmed.length > 1000) {
    return NextResponse.json({ error: 'too_long' }, { status: 400 });
  }

  try {
    // 校验作者
    const [existing] = await db
      .select({ userId: guestbookMessages.userId })
      .from(guestbookMessages)
      .where(eq(guestbookMessages.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const [updated] = await db
      .update(guestbookMessages)
      .set({ body: trimmed, updatedAt: new Date() })
      .where(eq(guestbookMessages.id, id))
      .returning();

    return NextResponse.json({ message: updated });
  } catch (err) {
    console.error('[guestbook] PATCH error', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/guestbook/[id]
 * 仅作者本人可删除；硬删除（楼中楼会一起断链）。
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select({ userId: guestbookMessages.userId })
      .from(guestbookMessages)
      .where(eq(guestbookMessages.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await db.delete(guestbookMessages).where(eq(guestbookMessages.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[guestbook] DELETE error', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
