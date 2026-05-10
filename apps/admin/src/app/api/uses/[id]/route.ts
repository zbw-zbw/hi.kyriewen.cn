import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { usesSections, usesItems } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/uses/[id] — 更新 section
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { sectionId, titleEn, titleZh, sortOrder } = body as {
      sectionId?: string;
      titleEn?: string;
      titleZh?: string;
      sortOrder?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (sectionId !== undefined) updates.sectionId = sectionId.trim();
    if (titleEn !== undefined) updates.titleEn = titleEn.trim();
    if (titleZh !== undefined) updates.titleZh = titleZh.trim();
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
      .update(usesSections)
      .set(updates)
      .where(eq(usesSections.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/uses] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/uses/[id] — 删除 section 及其所有 items
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    // 先删除该 section 下所有 items
    await db.delete(usesItems).where(eq(usesItems.sectionId, id));

    const [deleted] = await db
      .delete(usesSections)
      .where(eq(usesSections.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/uses] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
