import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getTimelineByYear } from '@/lib/content-loader';
import { HeroProse } from '@/components/hero-prose';
import { ReadingProgress } from '@/components/reading-progress';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { formatDate, cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

const TYPE_DOT: Record<string, string> = {
  product: 'bg-[var(--accent)]',
  post: 'bg-sky-500',
  milestone: 'bg-purple-500',
  career: 'bg-amber-500',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('timeline') };
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('timeline.page');

  const groups = await getTimelineByYear(locale);

  return (
    <>
      <ReadingProgress />

      <div className="space-y-16">
        <HeroProse>
          <p>{t('title')}</p>
          <p className="mt-4 text-[length:var(--text-body)] font-normal leading-relaxed text-[var(--muted-fg)]">
            {t('subtitle')}
          </p>
        </HeroProse>

        <div className="space-y-14">
          {groups.map(({ year, events }, groupIndex) => (
            <ScrollReveal key={year} delay={groupIndex * 0.08}>
              <SectionHeading
                index={String(groupIndex + 1).padStart(2, '0')}
                eyebrow={String(year)}
                title={String(year)}
              />
              <ul className="space-y-4 border-l border-[var(--border)] pl-5">
                {events.map((event) => (
                  <li key={event.date} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[26px] top-2 h-2 w-2 rounded-full ring-2 ring-[var(--bg)]',
                        TYPE_DOT[event.type] ?? 'bg-[var(--muted)]'
                      )}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h3 className="font-medium">{event.title[locale]}</h3>
                        <span className="font-mono text-xs text-[var(--muted)]">
                          {formatDate(event.date, locale)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-[var(--muted-fg)]">
                          {event.description[locale]}
                        </p>
                      )}
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          {event.url}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </>
  );
}
