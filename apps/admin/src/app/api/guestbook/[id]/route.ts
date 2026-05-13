import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { guestbookMessages } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/guestbook/[id] — 删除单条留言
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Also delete child replies
    await db.delete(guestbookMessages).where(eq(guestbookMessages.parentId, numId));

    const deleted = await db
      .delete(guestbookMessages)
      .where(eq(guestbookMessages.id, numId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/guestbook']).catch(() => {});

    return NextResponse.json({ ok: true, deleted: deleted[0] });
  } catch (err) {
    console.error('[guestbook] delete error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
