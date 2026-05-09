import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { asc } from 'drizzle-orm';
import { db, statsSnapshot } from '@/lib/db';
import type { StatsSnapshot } from '@/lib/db';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { StatsCard } from '@/components/stats-card';
import { StatsChart } from '@/components/stats-chart';
import { SectionHeading } from '@/components/section-heading';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stats' };

type LoadResult =
  | { ok: true; rows: StatsSnapshot[] }
  | { ok: false; reason: 'cert' | 'network' | 'unknown' };

async function loadSnapshots(): Promise<LoadResult> {
  try {
    const rows = await db
      .select()
      .from(statsSnapshot)
      .orderBy(asc(statsSnapshot.date))
      .limit(90);
    console.log('[stats] loaded', rows.length, 'snapshots');
    return { ok: true, rows };
  } catch (err) {
    console.error('[stats] loadSnapshots failed', err);
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === 'object' && 'cause' in err
        ? // @ts-expect-error - drilling into nested error cause
          (err.cause?.cause?.code ?? err.cause?.code)
        : undefined;
    if (code === 'SELF_SIGNED_CERT_IN_CHAIN' || message.includes('certificate')) {
      return { ok: false, reason: 'cert' };
    }
    if (message.includes('fetch failed') || message.includes('ETIMEDOUT')) {
      return { ok: false, reason: 'network' };
    }
    return { ok: false, reason: 'unknown' };
  }
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('stats.page');

  const result = await loadSnapshots();
  const snapshots = result.ok ? result.rows : [];
  const latest = snapshots.at(-1);
  const prev = snapshots.length > 1 ? snapshots.at(-2) : null;

  // 过去 30 天切片（snapshot 已按 asc 排序，slice -30 即最近 30 条）
  const last30 = snapshots.slice(-30);

  const toSeries = (source: StatsSnapshot[], key: keyof StatsSnapshot) =>
    source.map((s) => ({
      date: s.date,
      value: Number(s[key] ?? 0),
    }));

  const trend = (key: keyof StatsSnapshot) => {
    if (!latest || !prev) return 0;
    return Number(latest[key] ?? 0) - Number(prev[key] ?? 0);
  };

  const emptyHint = t('emptyHint');

  return (
    <div className="space-y-10">
      <HeroProse>
        <p>{t('title')}</p>
        <p className="mt-2 text-[length:var(--text-body)] font-normal text-[var(--muted-fg)]">
          {t('subtitle')}
        </p>
      </HeroProse>

      {!result.ok ? (
        <div className="space-y-2 rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm">
          <p className="font-medium text-[var(--fg)]">
            {result.reason === 'cert'
              ? locale === 'zh'
                ? '数据库连接遇到证书拦截'
                : 'Database connection blocked by TLS certificate'
              : result.reason === 'network'
                ? locale === 'zh'
                  ? '数据库网络连接超时'
                  : 'Database network timeout'
                : locale === 'zh'
                  ? '数据加载失败'
                  : 'Failed to load stats'}
          </p>
          <p className="text-[var(--muted)]">
            {locale === 'zh'
              ? '稍后刷新或切换网络后重试。线上环境不会出现此问题。'
              : 'Try refreshing later or switch network. Production is unaffected.'}
          </p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          {t('noDataReady')}
        </div>
      ) : (
        <>
          <ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label={t('cardGithubStars')}
                value={latest?.githubStars ?? 0}
                trend={trend('githubStars')}
                hint={t('cardGithubStarsHint')}
              />
              <StatsCard
                label={t('cardFollowers')}
                value={latest?.githubFollowers ?? 0}
                trend={trend('githubFollowers')}
              />
              <StatsCard
                label={t('cardChromeUsers')}
                value={latest?.chromeTotalUsers ?? 0}
                trend={trend('chromeTotalUsers')}
                hint={t('cardChromeUsersHint')}
              />
              <StatsCard
                label={t('cardSubscribers')}
                value={latest?.newsletterSubscribers ?? 0}
                trend={trend('newsletterSubscribers')}
              />
            </div>
          </ScrollReveal>

          <ScrollReveal as="section" delay={0.1}>
            <SectionHeading
              index="01"
              eyebrow="GitHub"
              title={t('chartGithubStarsTitle')}
              subtitle={t('chartGithubStarsSub')}
            />
            <StatsChart
              data={toSeries(last30, 'githubStars')}
              label="Stars"
              emptyHint={emptyHint}
            />
          </ScrollReveal>

          <ScrollReveal as="section" delay={0.2}>
            <SectionHeading
              index="02"
              eyebrow="Chrome Extensions"
              title={t('chartChromeTitle')}
              subtitle={t('chartChromeSub')}
            />
            <StatsChart
              data={toSeries(last30, 'chromeTotalUsers')}
              label="Users"
              emptyHint={emptyHint}
            />
          </ScrollReveal>

          <ScrollReveal as="section" delay={0.3}>
            <SectionHeading
              index="03"
              eyebrow="Newsletter"
              title={t('chartSubscribersTitle')}
            />
            <StatsChart
              data={toSeries(last30, 'newsletterSubscribers')}
              label="Subscribers"
              emptyHint={emptyHint}
            />
          </ScrollReveal>
        </>
      )}
    </div>
  );
}
