import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { nowItems, nowConfig } from '@repo/db/schema';
import { asc } from 'drizzle-orm';
import { triggerRevalidation } from '@/lib/revalidate';

export async function GET() {
  try {
    const items = await db.select().from(nowItems).orderBy(asc(nowItems.sortOrder));

    const config = await db.select().from(nowConfig);

    return NextResponse.json({ items, config });
  } catch (error) {
    console.error('Failed to fetch now data:', error);
    return NextResponse.json({ error: 'Failed to fetch now data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { labelEn, labelZh, valueEn, valueZh, sortOrder } = body;

    if (!labelEn || !labelZh || !valueEn || !valueZh) {
      return NextResponse.json(
        { error: 'labelEn, labelZh, valueEn, valueZh are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(nowItems)
      .values({
        labelEn,
        labelZh,
        valueEn,
        valueZh,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/now']).catch(() => {});

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create now item:', error);
    return NextResponse.json({ error: 'Failed to create now item' }, { status: 500 });
  }
}
