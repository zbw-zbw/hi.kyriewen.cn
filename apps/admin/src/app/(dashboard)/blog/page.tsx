import { desc } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';
import { BlogList } from './blog-list';

export const dynamic = 'force-dynamic';

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function BlogPage() {
  const rows = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));

  const posts = rows.map((row) => ({
    ...row,
    tags: safeJsonParse<string[]>(row.tags, []),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Blog</h2>
        <p className="text-muted-foreground">
          Create and edit blog posts with MDX editor.
        </p>
      </div>
      <BlogList posts={posts} />
    </div>
  );
}
