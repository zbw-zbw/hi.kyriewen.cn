import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArrowUpRight, Star } from 'lucide-react';
import { USES, formatSince } from '@/content/uses';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

/** 5 颗星，按 rating 填充 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`Rating ${rating} out of 5`}
      title={`${rating} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3 transition-colors',
            i <= rating
              ? 'fill-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--border)]'
          )}
        />
      ))}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('uses') };
}

export default async function UsesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('uses.page');

  return (
    <div className="space-y-16">
      <HeroProse>
        <p>{t('title')}</p>
        <p className="mt-4 text-[length:var(--text-body)] font-normal leading-relaxed text-[var(--muted-fg)]">
          {t('subtitle')}
        </p>
      </HeroProse>

      <div className="space-y-14">
        {USES.map((section, sectionIndex) => (
          <ScrollReveal key={section.id} delay={sectionIndex * 0.08}>
            <SectionHeading
              index={String(sectionIndex + 1).padStart(2, '0')}
              eyebrow={section.id.toUpperCase()}
              title={section.title[locale]}
            />
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
              {section.items.map((item) => (
                <li
                  key={item.name}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer text-[var(--muted)] hover:text-[var(--accent)]"
                          aria-label={`${item.name} website`}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                      {item.since && (
                        <span className="font-mono text-[10px] tracking-wider text-[var(--muted)]">
                          · {formatSince(item.since, locale)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-fg)]">
                      {item.note[locale]}
                    </p>
                    {item.verdict && (
                      <p className="border-l-2 border-[var(--accent)] pl-3 text-xs italic leading-relaxed text-[var(--muted-fg)]">
                        &ldquo;{item.verdict[locale]}&rdquo;
                      </p>
                    )}
                  </div>
                  {item.rating !== undefined && (
                    <div className="flex shrink-0 items-center sm:pt-1">
                      <StarRating rating={item.rating} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
