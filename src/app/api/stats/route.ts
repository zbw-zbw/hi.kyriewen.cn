import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, statsSnapshot } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/stats');

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
    log.error('db_error', err);
    // 不用 200 掩盖数据库故障，否则监控和调用方都看不到异常
    return NextResponse.json({ snapshots: [], error: 'db_unavailable' }, { status: 503 });
  }
}
