import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@repo/db';
import { timelineEvents } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/timeline — 查询所有 timelineEvents，按 date 降序
 */
export async function GET() {
  try {
    const rows = await db.select().from(timelineEvents).orderBy(desc(timelineEvents.date));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[api/timeline] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/timeline — 新建 timelineEvent
 * Body: { date, titleEn, titleZh, descriptionEn?, descriptionZh?, type, url? }
 */
export async function POST(req: Request) {
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

    if (!date?.trim() || !titleEn?.trim() || !titleZh?.trim() || !type?.trim()) {
      return NextResponse.json(
        { error: 'date, titleEn, titleZh, and type are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(timelineEvents)
      .values({
        date: date.trim(),
        titleEn: titleEn.trim(),
        titleZh: titleZh.trim(),
        descriptionEn: descriptionEn?.trim() || null,
        descriptionZh: descriptionZh?.trim() || null,
        type: type.trim(),
        url: url?.trim() || null,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/timeline']).catch(() => {});

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/timeline] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
