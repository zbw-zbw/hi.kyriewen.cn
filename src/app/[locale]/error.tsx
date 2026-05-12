'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * 路由级错误兜底 — 页面 Server Component 报错时触发。
 * 因为在 [locale]/layout.tsx 内部渲染，Header/Footer 仍然可见。
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PageError]', error);
  }, [error]);

  // useTranslations 可能在国际化上下文不可用时抛异常，做兜底
  let title = 'Something went wrong';
  let description = 'An unexpected error occurred. Please try again or go back to the homepage.';
  let retryLabel = 'Try again';
  let homeLabel = 'Back to Home';

  try {
    const t = useTranslations('error');
    title = t('title');
    description = t('description');
    retryLabel = t('retry');
    homeLabel = t('home');
  } catch {
    // 国际化不可用时使用英文默认值
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-[var(--muted-fg)]">{description}</p>
        {error.digest && (
          <p className="font-mono text-xs text-[var(--muted)]">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--card)]"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-colors hover:opacity-90"
        >
          <Home className="h-4 w-4" />
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
