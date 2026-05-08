import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { NewsletterForm } from '@/components/newsletter-form';
import type { Locale } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Subscribe',
};

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-10">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {locale === 'zh' ? '订阅 Newsletter' : 'Subscribe'}
        </h1>
        <p className="text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '每月 1 封，分享新产品、技术文章和独立开发心得。随时可退订。'
            : 'One email per month. New products, essays, and indie-hacking notes. Unsubscribe anytime.'}
        </p>
      </header>

      <NewsletterForm />

      <ul className="space-y-2 text-sm text-[var(--muted)]">
        <li>
          ✉️{' '}
          {locale === 'zh'
            ? '由 Buttondown 托管，无追踪、无广告。'
            : 'Hosted by Buttondown — no tracking, no ads.'}
        </li>
        <li>
          🔒{' '}
          {locale === 'zh'
            ? '邮箱仅用于发送订阅邮件，不会分享给任何第三方。'
            : 'Your email is only used for the newsletter, never shared.'}
        </li>
      </ul>
    </div>
  );
}
