import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
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

/** 读取文件系统中的博客文章（src/content/blog/{locale}/*.mdx） */
function readFileBasedPosts() {
  const contentRoot = path.join(process.cwd(), '..', '..', 'src', 'content', 'blog');
  const locales = ['en', 'zh'];
  const posts: Array<{
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    content: string;
    tags: string[];
    lang: string;
    draft: number;
    coverImage: string | null;
    source: string | null;
    sourceUrl: string | null;
    publishedAt: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }> = [];

  let fakeId = -1;

  for (const locale of locales) {
    const dir = path.join(contentRoot, locale);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data, content } = matter(raw);
      const slug = file.replace(/\.(mdx|md)$/, '');
      const tags = Array.isArray(data.tags) ? data.tags : [];
      posts.push({
        id: fakeId--,
        slug,
        title: data.title ?? slug,
        summary: data.summary ?? null,
        content,
        tags,
        lang: locale,
        draft: data.draft ? 1 : 0,
        coverImage: data.coverImage ?? null,
        source: 'file',
        sourceUrl: null,
        publishedAt: data.date ?? null,
        createdAt: data.date ?? new Date().toISOString(),
        updatedAt: data.date ?? new Date().toISOString(),
      });
    }
  }

  return posts;
}

export default async function BlogPage() {
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));

  const dbPosts = rows.map((row) => ({
    ...row,
    tags: safeJsonParse<string[]>(row.tags, []),
  }));

  // 合并文件来源的文章（排除 DB 中已有同 slug+lang 的）
  const filePosts = readFileBasedPosts();
  const dbSlugsSet = new Set(dbPosts.map((p) => `${p.slug}__${p.lang}`));
  const uniqueFilePosts = filePosts.filter((p) => !dbSlugsSet.has(`${p.slug}__${p.lang}`));

  const allPosts = [...dbPosts, ...uniqueFilePosts];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Blog</h2>
        <p className="text-muted-foreground">Create and edit blog posts with MDX editor.</p>
      </div>
      <BlogList posts={allPosts} />
    </div>
  );
}
