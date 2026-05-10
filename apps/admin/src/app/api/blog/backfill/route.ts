import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/blog/backfill
 * Receives article content from the browser (which can fetch CSDN from a domestic IP)
 * and updates the database.
 *
 * Body: { id: number, content: string }
 * Or batch: { items: Array<{ id: number, content: string }> }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Batch mode
    if (Array.isArray(body.items)) {
      let updated = 0;
      let failed = 0;

      for (const item of body.items) {
        const { id, content } = item as { id: number; content: string };
        if (!id || !content) {
          failed++;
          continue;
        }

        try {
          await db
            .update(blogPosts)
            .set({ content, updatedAt: new Date() })
            .where(eq(blogPosts.id, id));
          updated++;
        } catch {
          failed++;
        }
      }

      return NextResponse.json({ ok: true, updated, failed });
    }

    // Single mode
    const { id, content } = body as { id: number; content: string };

    if (!id || !content) {
      return NextResponse.json(
        { error: 'id and content are required' },
        { status: 400 },
      );
    }

    const [row] = await db
      .update(blogPosts)
      .set({ content, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error('[api/blog/backfill] POST failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}

/**
 * GET /api/blog/backfill
 * Returns all CSDN articles that need content backfill
 * (content is empty, placeholder, or just a short summary).
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        sourceUrl: blogPosts.sourceUrl,
        source: blogPosts.source,
      })
      .from(blogPosts)
      .where(eq(blogPosts.source, 'csdn'));

    // Filter to only articles needing backfill (content is short/placeholder)
    // We can't easily check content length in the query, so we check all CSDN articles
    // and let the frontend decide which ones need backfill
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[api/blog/backfill] GET failed', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
