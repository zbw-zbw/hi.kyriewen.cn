import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ExternalLink, Github, Chrome } from 'lucide-react';
import { BackButton } from '@/components/back-button';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import { SectionHeading } from '@/components/section-heading';
import { ScrollReveal } from '@/components/scroll-reveal';
import { ReadingProgress } from '@/components/reading-progress';
import { getProjects, getProjectBySlug, type Project } from '@/lib/content-loader';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

/* ── Static Generation ── */

export async function generateStaticParams() {
  const PROJECTS = await getProjects();
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  const title = `${project.name} — ${project.tagline[locale]}`;
  return {
    title,
    description: project.description[locale],
    openGraph: { title, description: project.description[locale] },
  };
}

/* ── Page ── */

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const t = await getTranslations('projects.detail');

  const categoryLabel: Record<string, string> = {
    'chrome-extension': 'Chrome Extension',
    'web-app': 'Web App',
    library: 'Library',
  };

  return (
    <>
      <ReadingProgress />

      <article className="-mt-10 pb-20 sm:-mt-14">
        {/* ── Sticky Header: 仅返回按钮 ── */}
        <div className="sticky top-14 z-10 -mx-4 bg-[var(--bg)] px-4 pt-6 pb-4 sm:-mx-6 sm:px-6">
          <BackButton label={t('backLink')} />
          {/* 底部渐变遮罩 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 translate-y-full bg-gradient-to-b from-[var(--bg)] to-transparent" />
        </div>

        {/* 标题 + 描述 + CTA 按钮 */}
        <div className="mt-3">
          <div className="font-mono tracking-[0.18em] text-[var(--muted)] text-[var(--text-eyebrow)] uppercase">
            {categoryLabel[project.category]} · {project.year}
          </div>

          <h1
            className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            style={project.colorTheme ? { color: project.colorTheme } : undefined}
          >
            {project.name}
          </h1>

          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--muted-fg)] sm:text-xl">
            {project.tagline[locale]}
          </p>

          {/* CTA Buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <ExternalLink className="h-4 w-4" />
                Live Demo
              </a>
            )}
            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                <Github className="h-4 w-4" />
                Source
              </a>
            )}
            {project.chromeStoreId && (
              <a
                href={`https://chromewebstore.google.com/detail/${project.chromeStoreId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                <Chrome className="h-4 w-4" />
                Chrome Web Store
              </a>
            )}
          </div>
        </div>

        {/* ── Hero: Image（滚动区域） ── */}
        <ScrollReveal as="section">
          {/* Hero Image */}
          {project.heroImage && (
            <div className="mt-12 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] shadow-[var(--shadow-elevated)]">
              <Image
                src={project.heroImage}
                alt={`${project.name} hero`}
                width={1600}
                height={900}
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="h-auto w-full"
              />
            </div>
          )}
        </ScrollReveal>

        {/* ── FIG 01 — Overview ── */}
        <ScrollReveal as="section" className="mt-[var(--space-section)]">
          <SectionHeading index="01" eyebrow={t('overviewEyebrow')} title={t('overviewTitle')} />
          <p className="max-w-prose text-base leading-relaxed text-[var(--muted-fg)]">
            {project.description[locale]}
          </p>

          {/* Stack chips */}
          <div className="mt-6">
            <h3 className="mb-3 font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
              {t('stack')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--muted-fg)]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-[var(--muted)]">
            <div>
              <span className="font-mono text-xs tracking-widest uppercase">{t('category')}</span>
              <p className="mt-1 text-[var(--fg)]">{categoryLabel[project.category]}</p>
            </div>
            <div>
              <span className="font-mono text-xs tracking-widest uppercase">{t('year')}</span>
              <p className="mt-1 text-[var(--fg)]">{project.year}</p>
            </div>
          </div>
        </ScrollReveal>

        {/* ── FIG 02 — Why I built this ── */}
        <ScrollReveal as="section" className="mt-[var(--space-section)]">
          <SectionHeading index="02" eyebrow={t('whyEyebrow')} title={t('whyTitle')} />
          <div className="prose prose-neutral dark:prose-invert max-w-prose text-[var(--muted-fg)]">
            <p>{project.description[locale]}</p>
          </div>
        </ScrollReveal>

        {/* ── FIG 03 — Gallery (条件渲染) ── */}
        {project.gallery && project.gallery.length > 0 && (
          <ScrollReveal as="section" className="mt-[var(--space-section)]">
            <SectionHeading index="03" eyebrow={t('galleryEyebrow')} title={t('galleryTitle')} />
            <div className="grid gap-4 sm:grid-cols-2">
              {project.gallery.map((src, i) => (
                <ScrollReveal key={src} delay={i * 0.08}>
                  <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-soft)]">
                    <Image
                      src={src}
                      alt={`${project.name} screenshot ${i + 1}`}
                      width={800}
                      height={450}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="h-auto w-full"
                    />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* ── FIG 04 — Stats (条件渲染) ── */}
        {project.metrics && (
          <ScrollReveal as="section" className="mt-[var(--space-section)]">
            <SectionHeading
              index={project.gallery?.length ? '04' : '03'}
              eyebrow={t('statsEyebrow')}
              title={t('statsTitle')}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {project.metrics.users != null && (
                <MetricCard label="Users" value={project.metrics.users.toLocaleString()} />
              )}
              {project.metrics.stars != null && (
                <MetricCard label="GitHub Stars" value={project.metrics.stars.toLocaleString()} />
              )}
              {project.metrics.rating != null && (
                <MetricCard label="Rating" value={`${project.metrics.rating} / 5`} />
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ── FIG 05 — Changelog (条件渲染) ── */}
        {project.changelog && project.changelog.length > 0 && (
          <ScrollReveal as="section" className="mt-[var(--space-section)]">
            <SectionHeading
              index={figIndex(project, 'changelog')}
              eyebrow={t('changelogEyebrow')}
              title={t('changelogTitle')}
            />
            <ul className="space-y-4">
              {project.changelog.map((entry) => (
                <li
                  key={entry.version}
                  className="flex items-start gap-4 border-l-2 border-[var(--border)] pl-4"
                >
                  <div className="shrink-0">
                    <span className="font-mono text-sm font-semibold text-[var(--accent)]">
                      v{entry.version}
                    </span>
                    <p className="font-mono text-xs text-[var(--muted)]">{entry.date}</p>
                  </div>
                  <p className="text-sm text-[var(--muted-fg)]">{entry.notes[locale]}</p>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        )}
      </article>
    </>
  );
}

/* ── Helpers ── */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5',
        'shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-elevated)]',
      )}
    >
      <p className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--fg)] tabular-nums">
        {value}
      </p>
    </div>
  );
}

function figIndex(project: Project, section: 'changelog'): string {
  let idx = 3; // starts after Overview(01), Why(02)
  if (project.gallery?.length) idx++;
  if (project.metrics) idx++;
  if (section === 'changelog') return String(idx).padStart(2, '0');
  return String(idx).padStart(2, '0');
}
