import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Locale } from '@/i18n/routing';

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

function calcReadingTime(content: string) {
  const words = content
    .replace(/```[\s\S]*?```/g, '')
    .split(/\s+|[\u4e00-\u9fa5]/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

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

export function getAllPosts(locale: Locale): Post[] {
  return readPostsForLocale(locale);
}

export function getPostBySlug(locale: Locale, slug: string): Post | null {
  const posts = readPostsForLocale(locale);
  return posts.find((p) => p.slug === slug) ?? null;
}

export function getAllPostSlugs(): { locale: Locale; slug: string }[] {
  const locales: Locale[] = ['en', 'zh'];
  return locales.flatMap((locale) =>
    readPostsForLocale(locale).map((p) => ({ locale, slug: p.slug }))
  );
}
