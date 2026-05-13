import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '@repo/db';
import { blogPosts } from '@repo/db/schema';
import { triggerRevalidation } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 读取文件系统中已发布的博客文章 */
function readFileBasedPublishedPosts() {
  const contentRoot = path.join(process.cwd(), '..', '..', 'src', 'content', 'blog');
  const locales = ['en', 'zh'];
  const posts: Array<{
    slug: string;
    title: string;
    lang: string;
    draft: number;
    source: string;
  }> = [];

  for (const locale of locales) {
    const dir = path.join(contentRoot, locale);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data } = matter(raw);
      if (data.draft) continue;
      const slug = file.replace(/\.(mdx|md)$/, '');
      posts.push({
        slug,
        title: data.title ?? slug,
        lang: locale,
        draft: 0,
        source: 'file',
      });
    }
  }
  return posts;
}

/**
 * GET /api/blog — 查询所有 blogPosts，按 updatedAt 降序
 * 支持可选查询参数 ?lang=en|zh 和 ?slug=xxx 过滤
 * ?published=1 时只返回已发布文章（含文件来源）
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang');
    const slug = searchParams.get('slug');
    const publishedOnly = searchParams.get('published') === '1';

    let rows;
    if (lang && slug) {
      rows = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.lang, lang), eq(blogPosts.slug, slug)))
        .orderBy(desc(blogPosts.updatedAt));
    } else if (lang) {
      rows = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.lang, lang))
        .orderBy(desc(blogPosts.updatedAt));
    } else if (slug) {
      rows = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .orderBy(desc(blogPosts.updatedAt));
    } else {
      rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
    }

    let parsed = rows.map((row) => ({
      ...row,
      tags: safeParseTags(row.tags),
    }));

    // 只返回已发布文章时过滤 draft
    if (publishedOnly) {
      parsed = parsed.filter((p) => p.draft === 0);
    }

    // 合并文件来源的已发布文章
    const filePosts = readFileBasedPublishedPosts();
    const dbSlugs = new Set(parsed.map((p) => `${p.slug}__${p.lang}`));
    const uniqueFilePosts = filePosts.filter((p) => !dbSlugs.has(`${p.slug}__${p.lang}`));

    const allData = [...parsed, ...uniqueFilePosts];

    return NextResponse.json({ data: allData });
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
    const { slug, title, summary, content, tags, lang, draft, coverImage, publishedAt } =
      body as Record<string, unknown>;

    if (
      !slug ||
      typeof slug !== 'string' ||
      !title ||
      typeof title !== 'string' ||
      !content ||
      typeof content !== 'string'
    ) {
      return NextResponse.json({ error: 'slug, title, and content are required' }, { status: 400 });
    }

    const draftValue = draft !== undefined ? Number(draft) : 1;
    const resolvedPublishedAt = resolvePublishedAt(
      draftValue,
      publishedAt as string | null | undefined,
    );

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

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/blog']).catch(() => {});

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

function resolvePublishedAt(draft: number, publishedAt: string | null | undefined): Date | null {
  if (publishedAt) return new Date(publishedAt);
  if (draft === 0) return new Date();
  return null;
}
