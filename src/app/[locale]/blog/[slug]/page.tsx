import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Mdx } from '@/components/mdx';
import { Toc } from '@/components/toc';
import { ReadingProgress } from '@/components/reading-progress';
import { NewsletterForm } from '@/components/newsletter-form';
import { BlogPostingJsonLd } from '@/components/json-ld';
import { Card } from '@/components/ui/card';
import {
  extractToc,
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug,
} from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { routing, type Locale } from '@/i18n/routing';

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
  return getAllPostSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale, slug);
  if (!post) return {};

  const url = buildPostUrl(locale, slug);
  const ogUrl = buildOgUrl(post.title, post.summary);

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, buildPostUrl(l, slug)])
      ),
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

  const post = getPostBySlug(locale, slug);
  if (!post) notFound();

  const url = buildPostUrl(locale, slug);
  const toc = extractToc(post.content);
  const { previous, next } = getAdjacentPosts(locale, slug);

  return (
    <>
      <BlogPostingJsonLd
        title={post.title}
        summary={post.summary}
        date={post.date}
        url={url}
      />
      <ReadingProgress />
      <div className="relative flex gap-10 lg:justify-center">
        <article className="min-w-0 flex-1 space-y-8 lg:max-w-2xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-3 w-3" />
            {locale === 'zh' ? '返回博客' : 'Back to writing'}
          </Link>

          <header className="space-y-3 border-b border-[var(--border)] pb-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <p className="text-[var(--muted-fg)]">{post.summary}</p>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[var(--muted)]">
              <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
              <span aria-hidden>·</span>
              <span>
                {post.readingTime}{' '}
                {locale === 'zh' ? '分钟阅读' : 'min read'}
              </span>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{post.tags.map((t) => `#${t}`).join(' ')}</span>
                </>
              )}
            </div>
          </header>

          <div className="prose-kw space-y-4 leading-relaxed">
            <Mdx source={post.content} />
          </div>

          {(previous || next) && (
            <nav
              aria-label={
                locale === 'zh' ? '文章翻页导航' : 'Post navigation'
              }
              className="grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2"
            >
              {previous ? (
                <Link
                  href={`/blog/${previous.slug}`}
                  prefetch
                  className="group flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
                >
                  <span className="flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                    <ArrowLeft className="h-3 w-3" />
                    {locale === 'zh' ? '上一篇' : 'Previous'}
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
                    {locale === 'zh' ? '下一篇' : 'Next'}
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

          <Card className="space-y-3 p-6">
            <h3 className="font-semibold">
              {locale === 'zh'
                ? '喜欢这篇文章？'
                : 'Enjoyed this post?'}
            </h3>
            <p className="text-sm text-[var(--muted)]">
              {locale === 'zh'
                ? '订阅 Newsletter，下一篇就不用自己找了。'
                : 'Subscribe to the newsletter — new posts straight to your inbox.'}
            </p>
            <NewsletterForm />
          </Card>
        </article>

        <Toc entries={toc} locale={locale} />
      </div>
    </>
  );
}
