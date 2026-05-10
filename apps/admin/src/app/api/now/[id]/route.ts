import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { nowItems } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const { labelEn, labelZh, valueEn, valueZh, sortOrder } = body;

    const [updated] = await db
      .update(nowItems)
      .set({
        ...(labelEn !== undefined && { labelEn }),
        ...(labelZh !== undefined && { labelZh }),
        ...(valueEn !== undefined && { valueEn }),
        ...(valueZh !== undefined && { valueZh }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(nowItems.id, itemId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update now item:', error);
    return NextResponse.json(
      { error: 'Failed to update now item' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(nowItems)
      .where(eq(nowItems.id, itemId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete now item:', error);
    return NextResponse.json(
      { error: 'Failed to delete now item' },
      { status: 500 },
    );
  }
}
