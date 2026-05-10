import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { popularPosts } from '@repo/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const posts = await db
      .select()
      .from(popularPosts)
      .orderBy(desc(popularPosts.views));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Failed to fetch popular posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular posts' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, views, trend } = body as {
      slug: string;
      views?: number;
      trend?: string;
    };

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(popularPosts)
      .values({
        slug,
        views: views ?? 0,
        trend: trend ?? 'flat',
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create popular post:', error);
    return NextResponse.json(
      { error: 'Failed to create popular post' },
      { status: 500 },
    );
  }
}
