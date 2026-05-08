import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Mdx } from '@/components/mdx';
import { ReadingProgress } from '@/components/reading-progress';
import { NewsletterForm } from '@/components/newsletter-form';
import { Card } from '@/components/ui/card';
import { getAllPostSlugs, getPostBySlug } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

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
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.date,
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

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-2xl space-y-8">
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
    </>
  );
}
