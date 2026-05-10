import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';
import { BlogEditor } from '@/components/blog-editor';

export const dynamic = 'force-dynamic';

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  if (!Number.isFinite(id)) {
    notFound();
  }

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id));

  if (!post) {
    notFound();
  }

  const parsedPost = {
    ...post,
    tags: safeJsonParse<string[]>(post.tags, []),
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Post</h2>
        <p className="text-muted-foreground">
          Editing: {parsedPost.title}
        </p>
      </div>
      <BlogEditor post={parsedPost} />
    </div>
  );
}
