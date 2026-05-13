'use client';

import { useAdminLocale } from '@/components/locale-provider';

export function TopbarTitle() {
  const { t } = useAdminLocale();

  return <h1 className="text-muted-foreground text-sm font-medium">{t('topbar.title')}</h1>;
}
