import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductCard } from '@/components/product-card';
import { SectionHeading } from '@/components/section-heading';
import { NewsletterForm } from '@/components/newsletter-form';
import { getFeaturedProjects } from '@/content/projects';
import { NOW_CURRENTLY_BUILDING } from '@/content/now';
import { SOCIAL_LINKS } from '@/content/social';
import { getAllPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tSite = await getTranslations('site');

  const projects = getFeaturedProjects();
  const latestPosts = getAllPosts(locale).slice(0, 3);
  const currentlyBuilding = NOW_CURRENTLY_BUILDING[locale];

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--muted)]">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          <span>
            {t('hero.currentlyBuilding')}: <span className="text-[var(--fg)]">{currentlyBuilding}</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t('hero.greeting')}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--muted-fg)] sm:text-lg">
          {t('hero.intro')}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {tSite('description')}
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/projects" className={buttonVariants()}>
            {t('hero.ctaProjects')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/subscribe" className={buttonVariants({ variant: 'outline' })}>
            {t('hero.ctaSubscribe')}
          </Link>
        </div>
      </section>

      {/* Products */}
      <section>
        <SectionHeading
          title={t('products.title')}
          subtitle={t('products.subtitle')}
          action={
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--fg)]"
            >
              {locale === 'zh' ? '查看全部' : 'View all'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProductCard key={project.slug} project={project} locale={locale} />
          ))}
        </div>
      </section>

      {/* Latest Writing */}
      <section>
        <SectionHeading
          title={t('writing.title')}
          action={
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--fg)]"
            >
              {t('writing.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {latestPosts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {locale === 'zh' ? '即将开始写作。' : 'Writing coming soon.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {latestPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex items-baseline justify-between gap-4 py-3 hover:text-[var(--accent)]"
                >
                  <span className="font-medium">{post.title}</span>
                  <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                    {formatDate(post.date, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Newsletter */}
      <section>
        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {locale === 'zh' ? '订阅 Newsletter' : 'Subscribe to the newsletter'}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {locale === 'zh'
              ? '每月 1 封，分享新产品、技术文章和独立开发心得。'
              : 'One email per month: new products, essays, and indie-hacking notes.'}
          </p>
          <NewsletterForm />
        </Card>
      </section>

      {/* Connect */}
      <section>
        <SectionHeading title={t('connect.title')} />
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_LINKS.map(({ name, href, Icon, handle }) => (
            <a
              key={name}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent)]" />
                <span className="text-sm font-medium">{name}</span>
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {handle}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
