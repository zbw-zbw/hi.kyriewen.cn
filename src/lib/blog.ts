import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import type { Locale } from '@/i18n/routing';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

export interface PostFrontmatter {
  title: string;
  summary: string;
  date: string; // ISO date
  tags?: string[];
  lang?: Locale;
  draft?: boolean;
}

export interface Post extends PostFrontmatter {
  slug: string;
  locale: Locale;
  content: string;
  readingTime: number; // minutes
}

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content', 'blog');

const blogSource = process.env.BLOG_SOURCE; // 'db' | 'file' | undefined

function shouldReadBlogDb(): boolean {
  if (blogSource === 'file') return false;
  if (blogSource === 'db') return true;
  return true; // default: try db first, fallback to file
}

function calcReadingTime(content: string) {
  const words = content
    .replace(/```[\s\S]*?```/g, '')
    .split(/\s+|[\u4e00-\u9fa5]/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// ── File-based readers (original) ──────────────────────────────

function readPostsForLocale(locale: Locale): Post[] {
  const dir = path.join(CONTENT_ROOT, locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data, content } = matter(raw);
      const fm = data as PostFrontmatter;
      const slug = file.replace(/\.(mdx|md)$/, '');
      return {
        ...fm,
        slug,
        locale,
        content,
        readingTime: calcReadingTime(content),
      } satisfies Post;
    })
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── Database readers ───────────────────────────────────────────

function dbRowToPost(row: typeof blogPosts.$inferSelect): Post {
  const tags: string[] = (() => {
    try {
      return JSON.parse(row.tags);
    } catch {
      return [];
    }
  })();
  const date = row.publishedAt
    ? row.publishedAt.toISOString().slice(0, 10)
    : row.createdAt.toISOString().slice(0, 10);
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    date,
    tags,
    lang: row.lang as Locale,
    draft: row.draft === 1,
    locale: row.lang as Locale,
    content: row.content,
    readingTime: calcReadingTime(row.content),
  };
}

async function readDbPostsForLocale(locale: Locale): Promise<Post[]> {
  try {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.lang, locale), eq(blogPosts.draft, 0)))
      .orderBy(desc(blogPosts.publishedAt));
    return rows.map(dbRowToPost);
  } catch {
    return [];
  }
}

// ── Public API (with DB/file switch) ───────────────────────────

export async function getAllPosts(locale: Locale): Promise<Post[]> {
  if (!shouldReadBlogDb()) return readPostsForLocale(locale);

  const dbPosts = await readDbPostsForLocale(locale);
  const filePosts = readPostsForLocale(locale);

  // Merge: DB posts take priority over file posts with same slug
  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  const uniqueFilePosts = filePosts.filter((p) => !dbSlugs.has(p.slug));
  const merged = [...dbPosts, ...uniqueFilePosts];

  return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlug(locale: Locale, slug: string): Promise<Post | null> {
  if (!shouldReadBlogDb()) {
    const posts = readPostsForLocale(locale);
    return posts.find((p) => p.slug === slug) ?? null;
  }
  try {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.lang, locale)))
      .limit(1);
    if (rows.length === 0) {
      // fallback to file
      const posts = readPostsForLocale(locale);
      return posts.find((p) => p.slug === slug) ?? null;
    }
    const post = dbRowToPost(rows[0]!);
    // Draft 文章不对外展示
    if (post.draft) return null;
    return post;
  } catch {
    // fallback to file on db error
    const posts = readPostsForLocale(locale);
    return posts.find((p) => p.slug === slug) ?? null;
  }
}

/**
 * 获取同 locale 下当前文章的前一篇 / 后一篇（按日期降序）。
 *
 * 列表页是"最新在上"的降序，所以这里：
 *   - previous：索引更大的（更旧的）
 *   - next：索引更小的（更新的）
 *
 * 首篇 / 尾篇对应的方向返回 null。
 */
export async function getAdjacentPosts(
  locale: Locale,
  slug: string,
): Promise<{ previous: Post | null; next: Post | null }> {
  const posts = shouldReadBlogDb()
    ? await readDbPostsForLocale(locale)
    : readPostsForLocale(locale);
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  };
}

export async function getAllPostSlugs(): Promise<{ locale: Locale; slug: string }[]> {
  const fileFallback = () => {
    const locales: Locale[] = ['en', 'zh'];
    return locales.flatMap((locale) =>
      readPostsForLocale(locale).map((p) => ({ locale, slug: p.slug })),
    );
  };
  if (!shouldReadBlogDb()) return fileFallback();
  try {
    const rows = await db
      .select({ slug: blogPosts.slug, lang: blogPosts.lang })
      .from(blogPosts)
      .where(eq(blogPosts.draft, 0));
    if (rows.length === 0) return fileFallback();
    return rows.map((r) => ({ locale: r.lang as Locale, slug: r.slug }));
  } catch {
    return fileFallback();
  }
}

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * 从 MDX 原文提取 ## / ### 级别的标题，并用 github-slugger 生成
 * 与 rehype-slug 一致的 id，方便右侧 TOC 点击锚定。
 */
export function extractToc(content: string): TocEntry[] {
  const slugger = new GithubSlugger();
  // 去掉 fenced code block，避免把 bash 注释误识别为标题
  const stripped = content.replace(/```[\s\S]*?```/g, '');
  const entries: TocEntry[] = [];

  for (const line of stripped.split('\n')) {
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1]!.length as 2 | 3;
    const text = match[2]!
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    entries.push({ id: slugger.slug(text), text, depth });
  }

  return entries;
}
