'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const next: Locale = locale === 'zh' ? 'en' : 'zh';
  const label = routing.locales.includes(next)
    ? next === 'zh'
      ? '中文'
      : 'EN'
    : next;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Switch language to ${label}`}
      onClick={() =>
        startTransition(() => {
          router.replace(pathname, { locale: next });
        })
      }
    >
      <Languages className="h-4 w-4" />
      <span className="hidden text-xs sm:inline">{label}</span>
    </Button>
  );
}
