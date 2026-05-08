import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
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
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {locale === 'zh' ? '博客' : 'Writing'}
        </h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '技术笔记、独立开发者心得，不定期更新。'
            : 'Notes on code, craft and indie hacking. Written when there is something worth saying.'}
        </p>
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
