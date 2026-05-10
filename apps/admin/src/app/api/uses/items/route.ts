import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { usesItems } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/uses/items — 新建 item
 * Body: { sectionId, name, url?, noteEn?, noteZh?, rating?, verdictEn?, verdictZh?, since?, sortOrder? }
 */
export async function POST(req: Request) {
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

    if (!sectionId || !name?.trim()) {
      return NextResponse.json(
        { error: 'sectionId and name are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(usesItems)
      .values({
        sectionId,
        name: name.trim(),
        url: url?.trim() || null,
        noteEn: noteEn?.trim() || '',
        noteZh: noteZh?.trim() || '',
        rating: rating ?? null,
        verdictEn: verdictEn?.trim() || null,
        verdictZh: verdictZh?.trim() || null,
        since: since?.trim() || null,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/uses/items] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
