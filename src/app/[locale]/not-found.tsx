'use client';

import { useTranslations } from 'next-intl';
import { Home } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function NotFoundPage() {
  let title = 'Page not found';
  let description = "The page you're looking for doesn't exist or has been moved.";
  let homeLabel = 'Back to Home';

  try {
    const t = useTranslations('notFound');
    title = t('title');
    description = t('description');
    homeLabel = t('home');
  } catch {
    // 国际化不可用时使用英文默认值
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="text-6xl font-bold text-[var(--muted)]">404</div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-[var(--muted-fg)]">{description}</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-colors hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        {homeLabel}
      </Link>
    </div>
  );
}
