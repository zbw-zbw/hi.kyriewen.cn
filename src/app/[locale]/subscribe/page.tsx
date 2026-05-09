import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { NewsletterForm } from '@/components/newsletter-form';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Subscribe',
};

/**
 * Mock 数据：最近发出的几期邮件标题。
 * 真实接入 Resend / Buttondown 后改成 server fetch。
 */
const RECENT_ISSUES: Array<{
  date: string;
  title: { en: string; zh: string };
}> = [
  {
    date: '2026-04-30',
    title: {
      en: 'Issue #03 — Building in public, 90 days in',
      zh: '第 03 期 —— 公开造物的 90 天复盘',
    },
  },
  {
    date: '2026-03-31',
    title: {
      en: 'Issue #02 — Why I rewrote my site in Next.js 15',
      zh: '第 02 期 —— 为什么我用 Next.js 15 重写了个人站',
    },
  },
  {
    date: '2026-02-28',
    title: {
      en: 'Issue #01 — Hello, indie life',
      zh: '第 01 期 —— 你好，独立开发',
    },
  },
];

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('subscribe.page');
  const isZh = locale === 'zh';

  // Tailwind perks 数组：next-intl 的 plural 不太适合数组，直接 raw 取
  const perks = (
    (await getTranslations({ locale, namespace: 'subscribe.page' })).raw(
      'perks'
    ) as string[]
  ) ?? [];

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
        <Card className="space-y-4 p-6">
          <NewsletterForm />
          <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('footnote')}
          </p>
        </Card>
      </ScrollReveal>

      {/* ── 我承诺什么 ── */}
      <ScrollReveal delay={0.1}>
        <SectionHeading
          index="01"
          eyebrow={isZh ? '承诺' : 'Promise'}
          title={isZh ? '你会得到什么' : "What you'll get"}
        />
        <ul className="space-y-3">
          {perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
              <span className="text-sm leading-relaxed text-[var(--card-fg)]">
                {perk}
              </span>
            </li>
          ))}
        </ul>
      </ScrollReveal>

      {/* ── 礼貌承诺：不卖名单 / 一键退订 / 频率 ── */}
      <ScrollReveal delay={0.15}>
        <div className="grid gap-3 sm:grid-cols-3">
          <PromiseCard
            icon={<Mail className="h-4 w-4" />}
            title={isZh ? '每月一封' : 'Once a month'}
            desc={isZh ? '从不打扰，节奏稳定。' : 'Steady cadence, never noisy.'}
          />
          <PromiseCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title={isZh ? '不卖名单' : 'No list selling'}
            desc={
              isZh
                ? '邮箱仅用于发邮件。'
                : 'Your email is used solely to send the letter.'
            }
          />
          <PromiseCard
            icon={<Sparkles className="h-4 w-4" />}
            title={isZh ? '一键退订' : 'One-click unsubscribe'}
            desc={
              isZh
                ? '每封邮件底部都有退订链接。'
                : 'Every email includes an unsubscribe link.'
            }
          />
        </div>
      </ScrollReveal>

      {/* ── 最近三期 ── */}
      <ScrollReveal delay={0.2}>
        <SectionHeading
          index="02"
          eyebrow={isZh ? '往期' : 'Archive'}
          title={isZh ? '最近三期' : 'Recent issues'}
        />
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
          {RECENT_ISSUES.map((issue) => (
            <li
              key={issue.date}
              className="flex items-baseline justify-between gap-4 p-4"
            >
              <span className="text-sm font-medium">
                {issue.title[locale]}
              </span>
              <time className="shrink-0 font-mono text-xs text-[var(--muted)]">
                {issue.date}
              </time>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {isZh
            ? '* 历史邮件归档功能开发中，敬请期待。'
            : '* Full archive coming soon.'}
        </p>
      </ScrollReveal>
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
