import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { usesSections, usesItems } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/uses — 查询所有 sections 和 items
 */
export async function GET() {
  try {
    const sections = await db.select().from(usesSections).orderBy(asc(usesSections.sortOrder));

    const items = await db
      .select()
      .from(usesItems)
      .orderBy(asc(usesItems.sectionId), asc(usesItems.sortOrder));

    return NextResponse.json({ sections, items });
  } catch (error) {
    console.error('[api/uses] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/uses — 新建 section
 * Body: { sectionId, titleEn, titleZh, sortOrder? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sectionId, titleEn, titleZh, sortOrder } = body as {
      sectionId?: string;
      titleEn?: string;
      titleZh?: string;
      sortOrder?: number;
    };

    if (!sectionId?.trim() || !titleEn?.trim() || !titleZh?.trim()) {
      return NextResponse.json(
        { error: 'sectionId, titleEn, and titleZh are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(usesSections)
      .values({
        sectionId: sectionId.trim(),
        titleEn: titleEn.trim(),
        titleZh: titleZh.trim(),
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/uses']).catch(() => {});

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/uses] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
