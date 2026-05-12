import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Rss } from 'lucide-react';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { NewsletterForm } from '@/components/newsletter-form';
import { BlogList } from '@/components/blog-list';
import { getAllPosts } from '@/lib/blog';
import type { Locale } from '@/i18n/routing';

/** 每 60 秒重新验证，确保后台发布新文章后前台能及时更新 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('blog') };
}

export default async function BlogIndexPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('blog.page');
  const allPosts = await getAllPosts(locale);
  const posts = allPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    date: p.date,
    tags: p.tags,
  }));

  return (
    <div className="space-y-10">
      <HeroProse
        footer={
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('rssLabel')}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            <Rss className="h-3.5 w-3.5" />
            RSS
          </a>
        }
      >
        <p>{t('title')}</p>
        <p className="mt-2 text-[length:var(--text-body)] font-normal text-[var(--muted-fg)]">
          {t('subtitle')}
        </p>
      </HeroProse>

      <ScrollReveal>
        <BlogList posts={posts} locale={locale} emptyText={t('empty')} allLabel={t('allTags')} />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-fg)]">{t('subscribeLine')}</p>
            <NewsletterForm className="sm:max-w-sm" />
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
