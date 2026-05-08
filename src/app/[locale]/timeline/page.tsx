import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getTimelineByYear } from '@/content/timeline';
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

  const groups = getTimelineByYear(locale);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {locale === 'zh' ? '时间线' : 'Timeline'}
        </h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '产品发布、文章发表和人生重要节点。'
            : 'Product launches, essays and personal milestones.'}
        </p>
      </section>

      <div className="space-y-10">
        {groups.map(({ year, events }) => (
          <section key={year}>
            <h2 className="mb-4 font-mono text-xs tracking-widest text-[var(--muted)]">
              {year}
            </h2>
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
          </section>
        ))}
      </div>
    </div>
  );
}
