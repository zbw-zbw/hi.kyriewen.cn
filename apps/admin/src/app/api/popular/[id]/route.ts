import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { popularPosts } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { slug, views, trend } = body as {
      slug?: string;
      views?: number;
      trend?: string;
    };

    const [updated] = await db
      .update(popularPosts)
      .set({
        ...(slug !== undefined && { slug }),
        ...(views !== undefined && { views }),
        ...(trend !== undefined && { trend }),
        updatedAt: new Date(),
      })
      .where(eq(popularPosts.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Popular post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update popular post:', error);
    return NextResponse.json(
      { error: 'Failed to update popular post' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(popularPosts)
      .where(eq(popularPosts.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Popular post not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete popular post:', error);
    return NextResponse.json(
      { error: 'Failed to delete popular post' },
      { status: 500 },
    );
  }
}
