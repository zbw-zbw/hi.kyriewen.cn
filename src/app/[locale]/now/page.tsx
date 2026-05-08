import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { NOW_ITEMS, NOW_UPDATED_AT } from '@/content/now';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('now') };
}

export default async function NowPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Now</h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '这页说明我现在的关注点。灵感来自 Derek Sivers 的 nownownow.com。'
            : 'What I am focused on right now. Inspired by Derek Sivers\' nownownow.com.'}
        </p>
        <p className="font-mono text-xs text-[var(--muted)]">
          {locale === 'zh' ? '最后更新：' : 'Last updated: '}
          {formatDate(NOW_UPDATED_AT, locale)}
        </p>
      </section>

      <dl className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        {NOW_ITEMS.map((item) => (
          <div
            key={item.label.en}
            className="grid grid-cols-[7rem_1fr] gap-4 sm:grid-cols-[9rem_1fr]"
          >
            <dt className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
              {item.label[locale]}
            </dt>
            <dd className="text-sm leading-relaxed">{item.value[locale]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
