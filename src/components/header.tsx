'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { AccentSwitcher } from '@/components/accent-switcher';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { MobileNav } from '@/components/mobile-nav';
import { cn } from '@/lib/utils';

/** 所有导航项 — 按实用性排序，首页放第一位 */
const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/projects', key: 'projects' },
  { href: '/blog', key: 'blog' },
  { href: '/now', key: 'now' },
  { href: '/guestbook', key: 'guestbook' },
  { href: '/photos', key: 'photos' },
  { href: '/stats', key: 'stats' },
  { href: '/timeline', key: 'timeline' },
  { href: '/uses', key: 'uses' },
] as const;

/** 触发 ⌘K 命令面板 */
function triggerCommandMenu() {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    metaKey: true,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

export function Header() {
  const t = useTranslations('nav');
  const tSite = useTranslations('site');
  const pathname = usePathname();

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo — 纯文字，不带图标 */}
        <Link
          href="/"
          aria-label={t('home')}
          className="cursor-pointer text-sm font-semibold tracking-tight transition-colors hover:text-[var(--accent)]"
        >
          {tSite('name')}
        </Link>

        {/* 桌面端导航：全部展开，首页在第一位 */}
        <nav
          className="hidden items-center gap-0.5 text-sm md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'cursor-pointer rounded-md px-2 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)]',
                isActive(item.href) && 'text-[var(--fg)]'
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* 右侧工具栏 — gap-2 统一间距 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerCommandMenu}
            aria-label="Search"
            title="Search (⌘K)"
            className="hidden cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)] sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <button
            type="button"
            onClick={triggerCommandMenu}
            aria-label="Search"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)] sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <AccentSwitcher />
          <LocaleSwitcher />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
