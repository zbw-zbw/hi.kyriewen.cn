import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/blog/[id] — 获取单篇文章详情
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id));

    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      data: { ...row, tags: safeParseTags(row.tags) },
    });
  } catch (error) {
    console.error('[api/blog] GET [id] failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * PATCH /api/blog/[id] — 更新文章
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
      slug, title, summary, content,
      tags, lang, draft, coverImage, publishedAt,
    } = body as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (slug !== undefined) updates.slug = (slug as string).trim();
    if (title !== undefined) updates.title = (title as string).trim();
    if (summary !== undefined) updates.summary = summary || null;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? JSON.stringify(tags) : '[]';
    if (lang !== undefined) updates.lang = lang;
    if (draft !== undefined) updates.draft = Number(draft);
    if (coverImage !== undefined) updates.coverImage = coverImage || null;
    if (publishedAt !== undefined) updates.publishedAt = publishedAt ? new Date(publishedAt as string) : null;

    // draft=0 且 publishedAt 未提供时，自动设置发布时间
    if (Number(draft) === 0 && publishedAt === undefined) {
      const [existing] = await db
        .select({ publishedAt: blogPosts.publishedAt })
        .from(blogPosts)
        .where(eq(blogPosts.id, id));

      if (existing && !existing.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    const [updated] = await db
      .update(blogPosts)
      .set(updates)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[api/blog] PATCH failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/blog/[id] — 删除文章
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
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/blog] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

function safeParseTags(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
