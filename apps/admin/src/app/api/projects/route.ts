import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { projects } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_FIELDS = ['stack', 'gallery', 'metrics', 'changelog'] as const;

/**
 * GET /api/projects — 查询所有 projects，按 sortOrder 排序
 */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(projects)
      .orderBy(asc(projects.sortOrder));

    const parsed = rows.map((row) => {
      const result: Record<string, unknown> = { ...row };
      for (const field of JSON_FIELDS) {
        const value = result[field];
        if (typeof value === 'string') {
          try {
            result[field] = JSON.parse(value);
          } catch {
            result[field] = null;
          }
        }
      }
      return result;
    });

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error('[api/projects] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/projects — 新建 project
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      slug, name, category, year,
      taglineEn, taglineZh, descriptionEn, descriptionZh,
      stack, repo, live, chromeStoreId,
      featured, pinned, accent, heroImage,
      gallery, coverVideo, caseStudyEn, caseStudyZh,
      colorTheme, metrics, changelog, sortOrder,
    } = body as Record<string, unknown>;

    if (
      !slug || typeof slug !== 'string' ||
      !name || typeof name !== 'string' ||
      !category || typeof category !== 'string' ||
      year === undefined
    ) {
      return NextResponse.json(
        { error: 'slug, name, category, and year are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(projects)
      .values({
        slug: (slug as string).trim(),
        name: (name as string).trim(),
        category: (category as string).trim(),
        year: Number(year),
        taglineEn: ((taglineEn as string) || '').trim(),
        taglineZh: ((taglineZh as string) || '').trim(),
        descriptionEn: ((descriptionEn as string) || '').trim(),
        descriptionZh: ((descriptionZh as string) || '').trim(),
        stack: stack ? JSON.stringify(stack) : '[]',
        repo: (repo as string) || null,
        live: (live as string) || null,
        chromeStoreId: (chromeStoreId as string) || null,
        featured: Number(featured) || 0,
        pinned: Number(pinned) || 0,
        accent: (accent as string) || null,
        heroImage: (heroImage as string) || null,
        gallery: gallery ? JSON.stringify(gallery) : null,
        coverVideo: (coverVideo as string) || null,
        caseStudyEn: (caseStudyEn as string) || null,
        caseStudyZh: (caseStudyZh as string) || null,
        colorTheme: (colorTheme as string) || null,
        metrics: metrics ? JSON.stringify(metrics) : null,
        changelog: changelog ? JSON.stringify(changelog) : null,
        sortOrder: Number(sortOrder) || 0,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/projects] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
