import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { socialLinks } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/social/[id] — 更新 socialLink
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { name, href, iconName, handle, isEmail, sortOrder } = body as {
      name?: string;
      href?: string;
      iconName?: string;
      handle?: string;
      isEmail?: number;
      sortOrder?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (href !== undefined) updates.href = href.trim();
    if (iconName !== undefined) updates.iconName = iconName.trim();
    if (handle !== undefined) updates.handle = handle.trim() || null;
    if (isEmail !== undefined) updates.isEmail = isEmail;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
      .update(socialLinks)
      .set(updates)
      .where(eq(socialLinks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    triggerRevalidation(['/']).catch(() => {});
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/social] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/social/[id] — 删除 socialLink
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [deleted] = await db.delete(socialLinks).where(eq(socialLinks.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    triggerRevalidation(['/']).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/social] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
