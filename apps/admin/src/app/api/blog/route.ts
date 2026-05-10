import { NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/blog — 查询所有 blogPosts，按 updatedAt 降序
 * 支持可选查询参数 ?lang=en|zh 和 ?slug=xxx 过滤
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang');
    const slug = searchParams.get('slug');

    let rows;
    if (lang && slug) {
      rows = await db.select().from(blogPosts)
        .where(and(eq(blogPosts.lang, lang), eq(blogPosts.slug, slug)))
        .orderBy(desc(blogPosts.updatedAt));
    } else if (lang) {
      rows = await db.select().from(blogPosts)
        .where(eq(blogPosts.lang, lang))
        .orderBy(desc(blogPosts.updatedAt));
    } else if (slug) {
      rows = await db.select().from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .orderBy(desc(blogPosts.updatedAt));
    } else {
      rows = await db.select().from(blogPosts)
        .orderBy(desc(blogPosts.updatedAt));
    }

    const parsed = rows.map((row) => ({
      ...row,
      tags: safeParseTags(row.tags),
    }));

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error('[api/blog] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * POST /api/blog — 新建 blogPost
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      slug, title, summary, content,
      tags, lang, draft, coverImage, publishedAt,
    } = body as Record<string, unknown>;

    if (
      !slug || typeof slug !== 'string' ||
      !title || typeof title !== 'string' ||
      !content || typeof content !== 'string'
    ) {
      return NextResponse.json(
        { error: 'slug, title, and content are required' },
        { status: 400 },
      );
    }

    const draftValue = draft !== undefined ? Number(draft) : 1;
    const resolvedPublishedAt = resolvePublishedAt(draftValue, publishedAt as string | null | undefined);

    const [created] = await db
      .insert(blogPosts)
      .values({
        slug: (slug as string).trim(),
        title: (title as string).trim(),
        summary: (summary as string) || null,
        content: content as string,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : '[]',
        lang: (lang as string) || 'en',
        draft: draftValue,
        coverImage: (coverImage as string) || null,
        publishedAt: resolvedPublishedAt,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[api/blog] POST failed', error);
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

function resolvePublishedAt(
  draft: number,
  publishedAt: string | null | undefined,
): Date | null {
  if (publishedAt) return new Date(publishedAt);
  if (draft === 0) return new Date();
  return null;
}
