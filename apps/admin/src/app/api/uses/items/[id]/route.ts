import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { usesItems } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/uses/items/[id] — 更新 item
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
    const {
      sectionId,
      name,
      url,
      noteEn,
      noteZh,
      rating,
      verdictEn,
      verdictZh,
      since,
      sortOrder,
    } = body as {
      sectionId?: number;
      name?: string;
      url?: string;
      noteEn?: string;
      noteZh?: string;
      rating?: number;
      verdictEn?: string;
      verdictZh?: string;
      since?: string;
      sortOrder?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (sectionId !== undefined) updates.sectionId = sectionId;
    if (name !== undefined) updates.name = name.trim();
    if (url !== undefined) updates.url = url.trim() || null;
    if (noteEn !== undefined) updates.noteEn = noteEn.trim() || null;
    if (noteZh !== undefined) updates.noteZh = noteZh.trim() || null;
    if (rating !== undefined) updates.rating = rating;
    if (verdictEn !== undefined) updates.verdictEn = verdictEn.trim() || null;
    if (verdictZh !== undefined) updates.verdictZh = verdictZh.trim() || null;
    if (since !== undefined) updates.since = since.trim() || null;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
      .update(usesItems)
      .set(updates)
      .where(eq(usesItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/uses/items] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/uses/items/[id] — 删除 item
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
    const [deleted] = await db
      .delete(usesItems)
      .where(eq(usesItems.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/uses/items] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
