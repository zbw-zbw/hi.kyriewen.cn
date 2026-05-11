'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Image,
  Calendar,
  Wrench,
  Link2,
  TrendingUp,
  FileText,
  MessageSquare,
  Mail,
  Database,
  LogOut,
  RefreshCw,
  Languages,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAdminLocale } from '@/components/locale-provider';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    titleKey: 'nav.overview',
    items: [{ href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    titleKey: 'nav.content',
    items: [
      { href: '/blog', labelKey: 'nav.blog', icon: FileText },
      { href: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
      { href: '/now', labelKey: 'nav.now', icon: Clock },
      { href: '/photos', labelKey: 'nav.photos', icon: Image },
      { href: '/timeline', labelKey: 'nav.timeline', icon: Calendar },
      { href: '/uses', labelKey: 'nav.uses', icon: Wrench },
    ],
  },
  {
    titleKey: 'nav.engagement',
    items: [
      { href: '/newsletter', labelKey: 'nav.newsletter', icon: Mail },
      { href: '/guestbook', labelKey: 'nav.guestbook', icon: MessageSquare },
      { href: '/social', labelKey: 'nav.social', icon: Link2 },
      { href: '/popular', labelKey: 'nav.popular', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'nav.settings',
    items: [
      { href: '/navigation', labelKey: 'nav.navigation', icon: Link2 },
      { href: '/i18n', labelKey: 'nav.i18n', icon: Languages },
    ],
  },
  {
    titleKey: 'nav.system',
    items: [
      { href: '/sync', labelKey: 'nav.sync', icon: RefreshCw },
      { href: '/seed', labelKey: 'nav.seed', icon: Database },
    ],
  },
];

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_CYCLE: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useAdminLocale();

  const cycleTheme = () => {
    const currentIdx = THEME_CYCLE.indexOf((theme as 'light' | 'dark' | 'system') ?? 'system');
    const nextIdx = (currentIdx + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIdx] ?? 'system');
  };

  const currentTheme = (theme as keyof typeof THEME_ICONS) ?? 'system';
  const ThemeIcon = THEME_ICONS[currentTheme] ?? Monitor;
  const themeLabel = t(`theme.${currentTheme}`);

  return (
    <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r">
      {/* Logo */}
      <div className="border-sidebar-border flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">⚙️</span>
          <span>Admin Panel</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.titleKey} className="mb-4">
            <h3 className="text-muted-foreground/60 mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
              {t(group.titleKey)}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                      {t(item.labelKey)}
                      {isActive && <span className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-sidebar-border space-y-1 border-t p-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={cycleTheme}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <ThemeIcon className="h-4 w-4" />
          {themeLabel}
        </button>

        {/* Locale toggle */}
        <button
          type="button"
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Languages className="h-4 w-4" />
          {locale === 'zh' ? '中文 → EN' : 'EN → 中文'}
        </button>

        <Link
          href="/api/auth/signout"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.signout')}
        </Link>
      </div>
    </aside>
  );
}
