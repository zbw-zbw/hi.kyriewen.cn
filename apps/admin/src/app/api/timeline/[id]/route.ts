import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { timelineEvents } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/timeline/[id] — 更新 timelineEvent
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { date, titleEn, titleZh, descriptionEn, descriptionZh, type, url } = body as {
      date?: string;
      titleEn?: string;
      titleZh?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      type?: string;
      url?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (date !== undefined) updates.date = date?.trim() ?? '';
    if (titleEn !== undefined) updates.titleEn = titleEn?.trim() ?? '';
    if (titleZh !== undefined) updates.titleZh = titleZh?.trim() ?? '';
    if (descriptionEn !== undefined) updates.descriptionEn = descriptionEn?.trim() || null;
    if (descriptionZh !== undefined) updates.descriptionZh = descriptionZh?.trim() || null;
    if (type !== undefined) updates.type = type?.trim() ?? '';
    if (url !== undefined) updates.url = url?.trim() || null;

    const [updated] = await db
      .update(timelineEvents)
      .set(updates)
      .where(eq(timelineEvents.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/timeline']).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/timeline] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/timeline/[id] — 删除 timelineEvent
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [deleted] = await db.delete(timelineEvents).where(eq(timelineEvents.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/timeline']).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/timeline] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
