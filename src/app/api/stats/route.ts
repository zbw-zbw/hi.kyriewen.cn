import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, statsSnapshot } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 1800;

export async function GET() {
  try {
    const snapshots = await db
      .select()
      .from(statsSnapshot)
      .orderBy(desc(statsSnapshot.date))
      .limit(30);

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('[stats] db error', err);
    return NextResponse.json({ snapshots: [], error: 'db_unavailable' });
  }
}
