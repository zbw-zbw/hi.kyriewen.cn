import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getNowItems, getNowUpdatedAt } from '@/lib/content-loader';
import { LastfmWidget } from '@/components/lastfm-widget';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

// 页面整体 60 秒 revalidate：
// - NOW_ITEMS 是构建期数据，本来可以静态
// - 但 <LastfmWidget/> 是 async Server Component，如果页面全静态，
//   build 时烤进的 HTML（可能是"未连接"空态）会一直被 CDN 缓存
// - 声明 revalidate=60 让页面每分钟重新 SSR 一次，
//   内部 getRecentTracks 的 fetch 缓存继续生效
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('now') };
}

export default async function NowPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const NOW_ITEMS = await getNowItems();
  const NOW_UPDATED_AT = await getNowUpdatedAt();

  const t = await getTranslations('now.page');

  return (
    <div className="space-y-16">
      <HeroProse
        footer={
          <span className="font-mono text-xs text-[var(--muted)]">
            {t('lastUpdated')}: {formatDate(NOW_UPDATED_AT, locale)}
          </span>
        }
      >
        <p>{t('title')}</p>
        <p className="mt-4 text-[length:var(--text-body)] leading-relaxed font-normal text-[var(--muted-fg)]">
          {t('subtitle')}
        </p>
      </HeroProse>

      <div className="space-y-10">
        {NOW_ITEMS.map((item, itemIndex) => (
          <ScrollReveal key={item.label.en} delay={itemIndex * 0.06}>
            <article className="space-y-2">
              <h2 className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
                {item.label[locale]}
              </h2>
              <p className="max-w-prose text-base leading-relaxed text-[var(--fg)]">
                {item.value[locale]}
              </p>
            </article>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.1}>
        <article className="space-y-2">
          <h2 className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
            {t('listeningTitle')}
          </h2>
          <Suspense
            fallback={
              <div className="h-24 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)]" />
            }
          >
            <LastfmWidget locale={locale} />
          </Suspense>
        </article>
      </ScrollReveal>
    </div>
  );
}
