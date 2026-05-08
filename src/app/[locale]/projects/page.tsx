import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product-card';
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
      return { project, stats };
    })
  );

  const pinned = projectsWithStats.filter((p) => p.project.pinned);
  const others = projectsWithStats.filter((p) => !p.project.pinned);

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
              ? '日常在迭代、用户最多的四个产品。'
              : 'The four I keep iterating on with the most users.'
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {pinned.map(({ project, stats }) => (
            <ProductCard
              key={project.slug}
              project={project}
              locale={locale}
              stars={stats?.stars}
            />
          ))}
        </div>
      </section>

      {others.length > 0 && (
        <section>
          <SectionHeading
            title={locale === 'zh' ? '隐藏宝藏' : 'Hidden Gems'}
            subtitle={
              locale === 'zh'
                ? '还在打磨、但你可能会喜欢的作品。'
                : 'Works-in-progress you might enjoy.'
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map(({ project, stats }) => (
              <ProductCard
                key={project.slug}
                project={project}
                locale={locale}
                stars={stats?.stars}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
