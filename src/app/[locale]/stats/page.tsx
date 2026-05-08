import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { asc } from 'drizzle-orm';
import { db, statsSnapshot } from '@/lib/db';
import type { StatsSnapshot } from '@/lib/db';
import { StatsCard } from '@/components/stats-card';
import { StatsChart } from '@/components/stats-chart';
import { SectionHeading } from '@/components/section-heading';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stats' };

async function loadSnapshots(): Promise<StatsSnapshot[]> {
  try {
    return await db
      .select()
      .from(statsSnapshot)
      .orderBy(asc(statsSnapshot.date))
      .limit(90);
  } catch {
    return [];
  }
}

export default async function StatsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const snapshots = await loadSnapshots();
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

  const emptyHint =
    locale === 'zh'
      ? '数据累积中，Cron 每天 0:00 UTC 自动补采。'
      : 'Data is accumulating — the cron job runs every day at 00:00 UTC.';

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {locale === 'zh' ? '数据看板' : 'Stats'}
        </h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? 'Build in Public —— 数据每日 0:00 UTC 自动更新。'
            : 'Build in Public — numbers auto-refresh every day at 00:00 UTC.'}
        </p>
      </section>

      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          {locale === 'zh'
            ? '数据尚未就绪。请等待首次 Cron 执行（需要配置 POSTGRES_URL + CRON_SECRET）。'
            : 'No data yet. Waiting for the first cron run (requires POSTGRES_URL + CRON_SECRET).'}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label={locale === 'zh' ? 'GitHub Star' : 'GitHub Stars'}
              value={latest?.githubStars ?? 0}
              trend={trend('githubStars')}
              hint={locale === 'zh' ? '总数' : 'All time'}
            />
            <StatsCard
              label={locale === 'zh' ? 'GitHub 粉丝' : 'Followers'}
              value={latest?.githubFollowers ?? 0}
              trend={trend('githubFollowers')}
            />
            <StatsCard
              label={locale === 'zh' ? 'Chrome 用户' : 'Chrome Users'}
              value={latest?.chromeTotalUsers ?? 0}
              trend={trend('chromeTotalUsers')}
              hint={locale === 'zh' ? '所有扩展合计' : 'Across all extensions'}
            />
            <StatsCard
              label={locale === 'zh' ? '订阅' : 'Subscribers'}
              value={latest?.newsletterSubscribers ?? 0}
              trend={trend('newsletterSubscribers')}
            />
          </div>

          <section>
            <SectionHeading
              title={
                locale === 'zh'
                  ? 'GitHub Star · 近 30 天'
                  : 'GitHub Stars · Last 30 days'
              }
              subtitle={
                locale === 'zh'
                  ? '每日一次采集，展示最近 30 个数据点。'
                  : 'One snapshot per day, last 30 data points.'
              }
            />
            <StatsChart
              data={toSeries(last30, 'githubStars')}
              label="Stars"
              emptyHint={emptyHint}
            />
          </section>

          <section>
            <SectionHeading
              title={
                locale === 'zh'
                  ? 'Chrome 用户 · 近 30 天'
                  : 'Chrome Users · Last 30 days'
              }
              subtitle={
                locale === 'zh'
                  ? '所有上架扩展的用户数合计。'
                  : 'Sum of users across all published extensions.'
              }
            />
            <StatsChart
              data={toSeries(last30, 'chromeTotalUsers')}
              label="Users"
              emptyHint={emptyHint}
            />
          </section>

          <section>
            <SectionHeading
              title={
                locale === 'zh'
                  ? 'Newsletter 订阅 · 近 30 天'
                  : 'Newsletter subscribers · Last 30 days'
              }
            />
            <StatsChart
              data={toSeries(last30, 'newsletterSubscribers')}
              label="Subscribers"
              emptyHint={emptyHint}
            />
          </section>
        </>
      )}
    </div>
  );
}
