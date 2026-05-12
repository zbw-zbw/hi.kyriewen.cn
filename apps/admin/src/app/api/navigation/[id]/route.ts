import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { navigationItems } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/navigation/[id] — 更新单个导航项
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { href, key, labelEn, labelZh, visible, sortOrder } = body as {
      href?: string;
      key?: string;
      labelEn?: string;
      labelZh?: string;
      visible?: number;
      sortOrder?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (href !== undefined) updates.href = href?.trim() ?? '';
    if (key !== undefined) updates.key = key?.trim() ?? '';
    if (labelEn !== undefined) updates.labelEn = labelEn?.trim() ?? '';
    if (labelZh !== undefined) updates.labelZh = labelZh?.trim() ?? '';
    if (visible !== undefined) updates.visible = visible;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
      .update(navigationItems)
      .set(updates)
      .where(eq(navigationItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/navigation] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/navigation/[id] — 删除单个导航项
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(navigationItems)
      .where(eq(navigationItems.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/']).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/navigation] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
