import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Link } from '@/i18n/navigation';
import { Mdx } from '@/components/mdx';
import { Toc } from '@/components/toc';
import { ReadingProgress } from '@/components/reading-progress';
import { BlogPostingJsonLd } from '@/components/json-ld';
import { SessionProvider } from '@/components/session-provider';
import { BlogComments } from '@/components/blog-comments';
import { auth } from '@/auth';
import { db, guestbookMessages, likes } from '@/lib/db';
import type { GuestbookMessage } from '@/lib/db';
import { TagBadge } from '@/components/tag-badge';
import { ViewCounter } from '@/components/view-counter';
import { extractToc, getAdjacentPosts, getAllPostSlugs, getPostBySlug } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { routing, type Locale } from '@/i18n/routing';

interface CommentBundle {
  messages: GuestbookMessage[];
  likes: { counts: Record<string, number>; mine: string[] };
}

async function loadComments(
  postSlug: string,
  currentUserId: string | null,
): Promise<CommentBundle> {
  try {
    const rows = await db
      .select()
      .from(guestbookMessages)
      .where(eq(guestbookMessages.postSlug, postSlug))
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(200);

    if (rows.length === 0) {
      return { messages: [], likes: { counts: {}, mine: [] } };
    }
    const ids = rows.map((r) => String(r.id));

    const counts: Record<string, number> = {};
    const countRows = await db
      .select({
        targetId: likes.targetId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(and(eq(likes.targetType, 'message'), inArray(likes.targetId, ids)))
      .groupBy(likes.targetId);
    for (const r of countRows) counts[r.targetId] = r.count;

    let mine: string[] = [];
    if (currentUserId) {
      const mineRows = await db
        .select({ targetId: likes.targetId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, currentUserId),
            eq(likes.targetType, 'message'),
            inArray(likes.targetId, ids),
          ),
        );
      mine = mineRows.map((r) => r.targetId);
    }

    return { messages: rows, likes: { counts, mine } };
  } catch (err) {
    console.error('[blog] loadComments failed', err);
    return { messages: [], likes: { counts: {}, mine: [] } };
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

function buildPostUrl(locale: Locale, slug: string) {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  return `${SITE_URL}${prefix}/blog/${slug}`;
}

function buildOgUrl(title: string, summary: string) {
  const params = new URLSearchParams({ title, subtitle: summary });
  return `${SITE_URL}/og?${params.toString()}`;
}

export async function generateStaticParams() {
  return await getAllPostSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPostBySlug(locale, slug);
  if (!post) return {};

  const url = buildPostUrl(locale, slug);
  const ogUrl = buildOgUrl(post.title, post.summary);

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(routing.locales.map((l) => [l, buildPostUrl(l, slug)])),
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      url,
      publishedTime: post.date,
      modifiedTime: post.date,
      tags: post.tags,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [ogUrl],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('blog.page');
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();

  const url = buildPostUrl(locale, slug);
  const toc = extractToc(post.content);
  const { previous, next } = await getAdjacentPosts(locale, slug);

  // 评论 + 登录态
  const session = await auth().catch(() => null);
  const currentUserId = session?.user?.id ?? null;
  const { messages: comments, likes: commentLikes } = await loadComments(slug, currentUserId);
  const user = session?.user
    ? {
        name: session.user.name ?? session.user.login ?? 'anonymous',
        image: session.user.image ?? null,
      }
    : null;

  return (
    <>
      <BlogPostingJsonLd title={post.title} summary={post.summary} date={post.date} url={url} />
      <ReadingProgress />
      <div className="relative -mt-10 flex gap-10 sm:-mt-14 lg:justify-center">
        <article className="min-w-0 flex-1 lg:max-w-2xl">
          {/* 吸顶返回按钮 */}
          <div className="sticky top-14 z-10 -mx-4 bg-[var(--bg)] px-4 pt-6 pb-4 sm:-mx-6 sm:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('backLabel')}
            </Link>
            {/* 底部渐变遮罩 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 translate-y-full bg-gradient-to-b from-[var(--bg)] to-transparent" />
          </div>

          {/* 文章标题 + 元信息 + 标签 */}
          <header className="mt-3 space-y-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{post.title}</h1>
            <p className="text-sm text-[var(--muted-fg)]">{post.summary}</p>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--muted)]">
              <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
              <span aria-hidden>·</span>
              <span>
                {post.readingTime} {t('minRead')}
              </span>
              <ViewCounter slug={`blog/${slug}`} trackView showDot />
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}
          </header>

          <div className="prose-kw mt-4 space-y-4 leading-relaxed">
            <Mdx source={post.content} />
          </div>

          {(previous || next) && (
            <nav
              aria-label={t('navLabel')}
              className="mt-12 grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2"
            >
              {previous ? (
                <Link
                  href={`/blog/${previous.slug}`}
                  prefetch
                  className="group flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
                >
                  <span className="flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                    <ArrowLeft className="h-3 w-3" />
                    {t('previous')}
                  </span>
                  <span className="line-clamp-2 text-sm font-medium group-hover:text-[var(--accent)]">
                    {previous.title}
                  </span>
                </Link>
              ) : (
                <span className="hidden sm:block" aria-hidden />
              )}
              {next ? (
                <Link
                  href={`/blog/${next.slug}`}
                  prefetch
                  className="group flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-right transition-colors hover:border-[var(--accent)] sm:text-right"
                >
                  <span className="flex items-center justify-end gap-1 font-mono text-xs text-[var(--muted)]">
                    {t('next')}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="line-clamp-2 text-sm font-medium group-hover:text-[var(--accent)]">
                    {next.title}
                  </span>
                </Link>
              ) : (
                <span className="hidden sm:block" aria-hidden />
              )}
            </nav>
          )}

          {/* ── 评论区（客户端增量更新，避免整页刷新） ── */}
          <SessionProvider session={session}>
            <BlogComments
              slug={slug}
              locale={locale}
              initialComments={comments}
              initialLikes={commentLikes}
              currentUserId={currentUserId}
              user={user}
            />
          </SessionProvider>
        </article>

        <Toc entries={toc} locale={locale} />
      </div>
    </>
  );
}
