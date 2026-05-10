import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_API = 'https://api.github.com';

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string;
}

/**
 * GET /api/cron/sync-projects
 *
 * 每日从 GitHub 拉取用户公开仓库，同步到 projects 表：
 * - 已存在的项目：只更新 stars 等元数据（不覆盖人工编辑的字段）
 * - 新项目：插入为 featured=0（草稿），等待人工审核
 */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const username = process.env.GITHUB_USERNAME ?? 'zbw-zbw';
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // 1. Fetch all public repos
    const res = await fetch(
      `${GITHUB_API}/users/${username}/repos?type=owner&per_page=100&sort=updated`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: 'GitHub API error', status: res.status },
        { status: 502 }
      );
    }

    const repos = (await res.json()) as GitHubRepo[];
    // Filter out forks and archived repos
    const activeRepos = repos.filter((r) => !r.fork && !r.archived);

    // 2. Get existing projects from DB
    const existingProjects = await db.select().from(projects);
    const existingSlugs = new Set(existingProjects.map((p) => p.slug));

    let updated = 0;
    let created = 0;
    const skipped: string[] = [];

    for (const repo of activeRepos) {
      const slug = repo.name.toLowerCase();

      if (existingSlugs.has(slug)) {
        // Update only metadata fields (don't overwrite human-edited content)
        await db
          .update(projects)
          .set({
            repo: repo.html_url,
            // Update metrics with latest star count
            metrics: JSON.stringify({
              ...((() => {
                try {
                  const existing = existingProjects.find(
                    (p) => p.slug === slug
                  );
                  return existing?.metrics
                    ? JSON.parse(existing.metrics)
                    : {};
                } catch {
                  return {};
                }
              })()),
              stars: repo.stargazers_count,
            }),
            updatedAt: new Date(),
          })
          .where(eq(projects.slug, slug));
        updated++;
      } else {
        // Insert as draft (featured=0, pinned=0)
        const year = new Date(repo.created_at).getFullYear();
        const stack = [repo.language, ...(repo.topics ?? [])].filter(
          Boolean
        ) as string[];

        await db.insert(projects).values({
          slug,
          name: repo.name,
          category: 'web-app',
          taglineEn: repo.description ?? '',
          taglineZh: '',
          descriptionEn: repo.description ?? '',
          descriptionZh: '',
          stack: JSON.stringify(stack),
          repo: repo.html_url,
          featured: 0, // draft — needs manual review
          pinned: 0,
          year,
          sortOrder: 999, // push to bottom
          metrics: JSON.stringify({ stars: repo.stargazers_count }),
        });
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: activeRepos.length,
      updated,
      created,
      skipped,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron:sync-projects] error', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
