import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Rss } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { NewsletterForm } from '@/components/newsletter-form';
import { getAllPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('blog') };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = getAllPosts(locale);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {locale === 'zh' ? '博客' : 'Writing'}
            </h1>
            <p className="text-[var(--muted-fg)]">
              {locale === 'zh'
                ? '技术笔记、独立开发者心得，不定期更新。'
                : 'Notes on code, craft and indie hacking. Written when there is something worth saying.'}
            </p>
          </div>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={locale === 'zh' ? 'RSS 订阅' : 'RSS feed'}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            <Rss className="h-3.5 w-3.5" />
            RSS
          </a>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-fg)]">
              {locale === 'zh'
                ? '订阅 Newsletter —— 有新文章，第一时间推到你邮箱。'
                : 'Subscribe — new posts delivered straight to your inbox.'}
            </p>
            <NewsletterForm className="sm:max-w-sm" />
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {locale === 'zh' ? '暂无文章。' : 'No posts yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                prefetch
                className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div className="flex-1 space-y-1">
                  <h2 className="font-medium group-hover:text-[var(--accent)]">
                    {post.title}
                  </h2>
                  <p className="text-sm text-[var(--muted-fg)]">
                    {post.summary}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {formatDate(post.date, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
