import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/blog/batch — 批量删除文章
 * Body: { ids: number[] }
 */
export async function DELETE(req: Request) {
  try {
    const { ids } = (await req.json()) as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array of numbers' },
        { status: 400 },
      );
    }

    const validIds = ids.filter((id) => Number.isFinite(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid ids provided' }, { status: 400 });
    }

    const deleted = await db
      .delete(blogPosts)
      .where(inArray(blogPosts.id, validIds))
      .returning({ id: blogPosts.id });

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      deletedIds: deleted.map((d) => d.id),
    });
  } catch (error) {
    console.error('[api/blog/batch] DELETE failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
