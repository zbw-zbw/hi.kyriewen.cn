import { NextResponse } from 'next/server';
import { db, statsSnapshot, productStats } from '@/lib/db';
import { fetchChromeStoreStats } from '@/lib/chrome-store';
import { PROJECTS } from '@/content/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const results = await Promise.all(
    PROJECTS.filter((p) => p.category === 'chrome-extension' && p.chromeStoreId).map(async (p) => {
      const stats = await fetchChromeStoreStats(p.chromeStoreId!);
      return { slug: p.slug, stats };
    }),
  );

  const totalUsers = results.reduce((sum, r) => sum + (r.stats?.users ?? 0), 0);

  try {
    await db
      .insert(statsSnapshot)
      .values({ date: today, chromeTotalUsers: totalUsers })
      .onConflictDoUpdate({
        target: statsSnapshot.date,
        set: { chromeTotalUsers: totalUsers },
      });

    for (const r of results) {
      if (!r.stats?.users) continue;
      await db
        .insert(productStats)
        .values({
          slug: r.slug,
          date: today,
          users: r.stats.users,
        })
        .onConflictDoUpdate({
          target: [productStats.slug, productStats.date],
          set: { users: r.stats.users },
        });
    }
  } catch (err) {
    console.error('[cron:chrome] db error', err);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    totalUsers,
    breakdown: results,
    updatedAt: today,
  });
}
