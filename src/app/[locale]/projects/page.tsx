import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product-card';
import { ProjectsFilter } from '@/components/projects-filter';
import { SectionHeading } from '@/components/section-heading';
import { PROJECTS } from '@/content/projects';
import { fetchRepoStats } from '@/lib/github';
import type { Locale } from '@/i18n/routing';

export const revalidate = 14400; // 4h ISR

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('projects') };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');

  const projectsWithStats = await Promise.all(
    PROJECTS.map(async (project) => {
      const stats = project.repo ? await fetchRepoStats(project.repo) : null;
      return { project, stars: stats?.stars };
    })
  );

  const pinned = projectsWithStats.filter((p) => p.project.pinned);

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('products.title')}
        </h1>
        <p className="text-[var(--muted-fg)]">{t('products.subtitle')}</p>
      </section>

      <section>
        <SectionHeading
          title={locale === 'zh' ? '主打作品' : 'Pinned'}
          subtitle={
            locale === 'zh'
              ? '日常在迭代、用户最多的几个产品。'
              : 'The ones I keep iterating on.'
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {pinned.map(({ project, stars }) => (
            <ProductCard
              key={project.slug}
              project={project}
              locale={locale}
              stars={stars}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title={locale === 'zh' ? '全部作品' : 'All Projects'}
          subtitle={
            locale === 'zh'
              ? '按分类筛选。'
              : 'Filter by category.'
          }
        />
        <ProjectsFilter projects={projectsWithStats} locale={locale} />
      </section>
    </div>
  );
}
