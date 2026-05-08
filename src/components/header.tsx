'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/projects', key: 'projects' },
  { href: '/blog', key: 'blog' },
  { href: '/now', key: 'now' },
  { href: '/stats', key: 'stats' },
  { href: '/timeline', key: 'timeline' },
  { href: '/uses', key: 'uses' },
  { href: '/guestbook', key: 'guestbook' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const tSite = useTranslations('site');
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight hover:text-[var(--accent)]"
        >
          {tSite('name')}
        </Link>

        <nav
          className="hidden items-center gap-1 text-sm md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.slice(1).map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)]',
                isActive(href) && 'text-[var(--fg)]'
              )}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
