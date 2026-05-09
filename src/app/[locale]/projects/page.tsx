import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { HeroProse } from '@/components/hero-prose';
import { ProductCard } from '@/components/product-card';
import { ProjectsFilter } from '@/components/projects-filter';
import { ScrollReveal } from '@/components/scroll-reveal';
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
  const t = await getTranslations({ locale, namespace: 'projects.page' });
  return { title: t('metaTitle') };
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tp = await getTranslations('projects.page');

  const projectsWithStats = await Promise.all(
    PROJECTS.map(async (project) => {
      const stats = project.repo ? await fetchRepoStats(project.repo) : null;
      return { project, stars: stats?.stars };
    })
  );

  const pinned = projectsWithStats.filter((p) => p.project.pinned);

  return (
    <div>
      {/* Hero */}
      <HeroProse eyebrow={tp('eyebrow')}>
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          {tp('title')}
        </p>
        <p className="mt-3 text-base text-[var(--muted-fg)]">{tp('subtitle')}</p>
      </HeroProse>

      {/* FIG 01 — Pinned */}
      <ScrollReveal as="section" className="mt-[var(--space-section)]">
        <SectionHeading
          index="01"
          eyebrow={tp('pinnedEyebrow')}
          title={tp('pinnedTitle')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {pinned.map(({ project, stars }, i) => (
            <ScrollReveal key={project.slug} delay={i * 0.08}>
              <ProductCard
                project={project}
                locale={locale}
                stars={stars}
                highlighted
              />
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      {/* FIG 02 — All Work */}
      <ScrollReveal as="section" className="mt-[var(--space-section)] pb-8">
        <SectionHeading
          index="02"
          eyebrow={tp('allEyebrow')}
          title={tp('allTitle')}
        />
        <ProjectsFilter projects={projectsWithStats} locale={locale} />
      </ScrollReveal>
    </div>
  );
}
