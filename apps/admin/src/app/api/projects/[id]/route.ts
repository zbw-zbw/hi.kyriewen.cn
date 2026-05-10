import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { projects } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/projects/[id] — 更新 project
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

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

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (slug !== undefined) updates.slug = (slug as string).trim();
    if (name !== undefined) updates.name = (name as string).trim();
    if (category !== undefined) updates.category = (category as string).trim();
    if (year !== undefined) updates.year = Number(year);
    if (taglineEn !== undefined) updates.taglineEn = taglineEn || null;
    if (taglineZh !== undefined) updates.taglineZh = taglineZh || null;
    if (descriptionEn !== undefined) updates.descriptionEn = descriptionEn || null;
    if (descriptionZh !== undefined) updates.descriptionZh = descriptionZh || null;
    if (stack !== undefined) updates.stack = stack ? JSON.stringify(stack) : null;
    if (repo !== undefined) updates.repo = repo || null;
    if (live !== undefined) updates.live = live || null;
    if (chromeStoreId !== undefined) updates.chromeStoreId = chromeStoreId || null;
    if (featured !== undefined) updates.featured = Number(featured) || 0;
    if (pinned !== undefined) updates.pinned = Number(pinned) || 0;
    if (accent !== undefined) updates.accent = accent || null;
    if (heroImage !== undefined) updates.heroImage = heroImage || null;
    if (gallery !== undefined) updates.gallery = gallery ? JSON.stringify(gallery) : null;
    if (coverVideo !== undefined) updates.coverVideo = coverVideo || null;
    if (caseStudyEn !== undefined) updates.caseStudyEn = caseStudyEn || null;
    if (caseStudyZh !== undefined) updates.caseStudyZh = caseStudyZh || null;
    if (colorTheme !== undefined) updates.colorTheme = colorTheme || null;
    if (metrics !== undefined) updates.metrics = metrics ? JSON.stringify(metrics) : null;
    if (changelog !== undefined) updates.changelog = changelog ? JSON.stringify(changelog) : null;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/projects] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id] — 删除 project
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/projects] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
