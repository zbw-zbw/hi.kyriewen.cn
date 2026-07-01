import { NextResponse } from 'next/server';
import { db, statsSnapshot, productStats } from '@/lib/db';
import { fetchUserStats, fetchRepoStats } from '@/lib/github';
import { PROJECTS } from '@/content/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 本地开发不校验
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const username = process.env.GITHUB_USERNAME ?? 'zbw-zbw';
  const user = await fetchUserStats(username);

  const today = new Date().toISOString().slice(0, 10);

  const productResults = await Promise.all(
    PROJECTS.filter((p) => p.repo).map(async (p) => {
      const stats = await fetchRepoStats(p.repo!);
      return { slug: p.slug, stars: stats?.stars ?? 0 };
    }),
  );

  try {
    if (user) {
      await db
        .insert(statsSnapshot)
        .values({
          date: today,
          githubStars: user.totalStars,
          githubFollowers: user.followers,
        })
        .onConflictDoUpdate({
          target: statsSnapshot.date,
          set: {
            githubStars: user.totalStars,
            githubFollowers: user.followers,
          },
        });
    }

    for (const pr of productResults) {
      await db
        .insert(productStats)
        .values({
          slug: pr.slug,
          date: today,
          stars: pr.stars,
        })
        .onConflictDoUpdate({
          target: [productStats.slug, productStats.date],
          set: { stars: pr.stars },
        });
    }
  } catch (err) {
    console.error('[cron:github] db error', err);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user,
    products: productResults,
    updatedAt: today,
  });
}
