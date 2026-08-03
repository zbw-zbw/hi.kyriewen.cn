import { NextResponse } from 'next/server';
import { db, statsSnapshot, productStats } from '@/lib/db';
import { fetchUserStats, fetchRepoStats } from '@/lib/github';
import { PROJECTS } from '@/content/projects';
import { authorizeCron } from '@/lib/cron-auth';
import { createLogger } from '@/lib/logger';
import { keepAliveRedis } from '@/lib/redis';

const log = createLogger('cron/github-stats');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Upstash 保活：必须放在所有外部调用之前。
  // 下面的 fetchUserStats 没有 try/catch，GitHub API 一挂整个 handler 就中断，
  // 保活若放在后面会被连带跳过 —— 而那正是最需要它生效的时候。
  await keepAliveRedis();

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
    log.error('db_error', err);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user,
    products: productResults,
    updatedAt: today,
  });
}
