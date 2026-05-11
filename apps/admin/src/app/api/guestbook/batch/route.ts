import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@repo/db';
import { guestbookMessages } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/guestbook/batch — 批量删除留言（含子回复）
 * Body: { ids: number[] }
 */
export async function DELETE(req: Request) {
  try {
    const { ids } = (await req.json()) as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array of numbers' },
        { status: 400 },
      );
    }

    const validIds = ids.filter((id) => Number.isFinite(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid ids provided' }, { status: 400 });
    }

    // Delete child replies first
    await db.delete(guestbookMessages).where(inArray(guestbookMessages.parentId, validIds));

    // Then delete the messages themselves
    const deleted = await db
      .delete(guestbookMessages)
      .where(inArray(guestbookMessages.id, validIds))
      .returning({ id: guestbookMessages.id });

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      deletedIds: deleted.map((d) => d.id),
    });
  } catch (error) {
    console.error('[api/guestbook/batch] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
