import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { NewsletterForm } from '@/components/newsletter-form';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/i18n/routing';
import { db } from '@/lib/db';
import { newsletterIssues } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Subscribe',
};

async function getRecentIssues() {
  try {
    const rows = await db
      .select({
        subject: newsletterIssues.subject,
        sentAt: newsletterIssues.sentAt,
      })
      .from(newsletterIssues)
      .orderBy(desc(newsletterIssues.sentAt))
      .limit(3);
    return rows.filter((r) => r.sentAt !== null);
  } catch {
    return [];
  }
}

export default async function SubscribePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('subscribe.page');
  const recentIssues = await getRecentIssues();

  // Tailwind perks 数组：next-intl 的 plural 不太适合数组，直接 raw 取
  const rawPerks = (await getTranslations({ locale, namespace: 'subscribe.page' })).raw('perks');
  const perks: string[] = Array.isArray(rawPerks) ? rawPerks : [];

  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <HeroProse eyebrow={t('eyebrow')}>
        <p>{t('title')}</p>
        <p className="mt-4 text-[length:var(--text-body)] font-normal text-[var(--muted-fg)]">
          {t('subtitle')}
        </p>
      </HeroProse>

      {/* ── 订阅表单 ── */}
      <ScrollReveal>
        <Card className="max-w-xl space-y-4 p-6">
          <NewsletterForm />
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('footnote')}
          </p>
        </Card>
      </ScrollReveal>

      {/* ── 我承诺什么 ── */}
      <ScrollReveal delay={0.1}>
        <SectionHeading index="01" eyebrow={t('promiseEyebrow')} title={t('promiseTitle')} />
        <ul className="space-y-3">
          {perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
              <span className="text-sm leading-relaxed text-[var(--card-fg)]">{perk}</span>
            </li>
          ))}
        </ul>
      </ScrollReveal>

      {/* ── 礼貌承诺：不卖名单 / 一键退订 / 频率 ── */}
      <ScrollReveal delay={0.15}>
        <div className="grid gap-3 sm:grid-cols-3">
          <PromiseCard
            icon={<Mail className="h-4 w-4" />}
            title={t('promiseOnceTitle')}
            desc={t('promiseOnceDesc')}
          />
          <PromiseCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title={t('promiseNoSellTitle')}
            desc={t('promiseNoSellDesc')}
          />
          <PromiseCard
            icon={<Sparkles className="h-4 w-4" />}
            title={t('promiseUnsubTitle')}
            desc={t('promiseUnsubDesc')}
          />
        </div>
      </ScrollReveal>

      {/* ── 最近三期 ── */}
      {recentIssues.length > 0 && (
        <ScrollReveal delay={0.2}>
          <SectionHeading index="02" eyebrow={t('archiveEyebrow')} title={t('archiveTitle')} />
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
            {recentIssues.map((issue) => (
              <li
                key={issue.sentAt!.toISOString()}
                className="flex items-baseline justify-between gap-4 p-4"
              >
                <span className="text-sm font-medium">{issue.subject}</span>
                <time className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {issue.sentAt!.toISOString().slice(0, 10)}
                </time>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      )}
    </div>
  );
}

function PromiseCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 text-[var(--accent)]">
        {icon}
        <span className="text-sm font-medium text-[var(--fg)]">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted-fg)]">{desc}</p>
    </div>
  );
}
