import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { USES } from '@/content/uses';
import type { Locale } from '@/i18n/routing';

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

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Uses</h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '我的硬件、软件、订阅服务清单。灵感来自 uses.tech。'
            : 'What I use day-to-day — hardware, software, services. Inspired by uses.tech.'}
        </p>
      </section>

      <div className="space-y-10">
        {USES.map((section) => (
          <section key={section.id}>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              {section.title[locale]}
            </h2>
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
              {section.items.map((item) => (
                <li key={item.name} className="flex items-start gap-4 p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--muted)] hover:text-[var(--accent)]"
                          aria-label={`${item.name} website`}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-fg)]">
                      {item.note[locale]}
                    </p>
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
