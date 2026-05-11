'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home,
  Package,
  FileText,
  Activity,
  BarChart3,
  Clock,
  Wrench,
  MessageSquare,
  Moon,
  Sun,
  Languages,
  Mail,
  Github,
  Twitter,
  BookOpen,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { ACCENTS, useAccent, type Accent } from '@/components/theme-accent-provider';
import { cn } from '@/lib/utils';
import type { NavigationItem, SocialLink } from '@/lib/content-loader';

/** 4 个 accent 色的展示色值（与 globals.css [data-accent] 中 light 模式保持一致） */
const ACCENT_SWATCH: Record<Accent, string> = {
  blue: '#4285f4',
  green: '#10b981',
  purple: '#8b5cf6',
  orange: '#f97316',
};

export interface SearchablePost {
  slug: string;
  title: string;
  summary: string;
  tags?: string[];
  date: string;
}

/** key → Icon 映射（用于从 navItems 动态匹配图标） */
const NAV_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  projects: Package,
  blog: FileText,
  now: Activity,
  stats: BarChart3,
  timeline: Clock,
  uses: Wrench,
  photos: ImageIcon,
  guestbook: MessageSquare,
  subscribe: BookOpen,
};

export function CommandMenu({
  posts = [],
  navItems = [],
  socialLinks = [],
}: {
  posts?: SearchablePost[];
  navItems?: NavigationItem[];
  socialLinks?: SocialLink[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const locale = useLocale() as Locale;
  const tNav = useTranslations('nav');
  const tCmd = useTranslations('command');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const runAndClose = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command
          loop
          className={cn(
            'flex flex-col',
            '[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:border-b [&_[cmdk-input]]:border-[var(--border)] [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:outline-none',
            '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--muted)]',
            '[&_[cmdk-item]]:flex [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item]]:items-center [&_[cmdk-item]]:gap-3 [&_[cmdk-item]]:rounded-md [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-sm',
            '[&_[cmdk-item][data-selected=true]]:bg-[var(--bg)]',
            '[&_[cmdk-empty]]:py-8 [&_[cmdk-empty]]:text-center [&_[cmdk-empty]]:text-sm [&_[cmdk-empty]]:text-[var(--muted)]',
          )}
        >
          <Command.Input placeholder={tCmd('placeholder')} />
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty>{tCmd('noResults')}</Command.Empty>

            <Command.Group heading={tCmd('groups.navigation')}>
              {navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const Icon = NAV_ICON_MAP[item.key] || Home;
                  return (
                    <Command.Item
                      key={item.href}
                      value={`nav ${item.key} ${tNav(item.key)}`}
                      onSelect={() => runAndClose(() => router.push(item.href))}
                      onMouseEnter={() => router.prefetch(item.href)}
                    >
                      <Icon className="h-4 w-4 text-[var(--muted)]" />
                      <span>{tNav(item.key)}</span>
                    </Command.Item>
                  );
                })}
            </Command.Group>

            {/* 产品搜索已移至导航项，可通过导航到 /projects 查看全部 */}

            {posts.length > 0 && (
              <Command.Group heading={tCmd('groups.blog')}>
                {posts.map((post) => {
                  const href = `/blog/${post.slug}`;
                  // cmdk 的 value 会参与模糊匹配，因此把 title / summary / tags 全拼进来。
                  const value = [
                    'blog',
                    post.slug,
                    post.title,
                    post.summary,
                    ...(post.tags ?? []),
                  ].join(' ');
                  return (
                    <Command.Item
                      key={post.slug}
                      value={value}
                      onSelect={() => runAndClose(() => router.push(href))}
                      onMouseEnter={() => router.prefetch(href)}
                    >
                      <BookOpen className="h-4 w-4 text-[var(--muted)]" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{post.title}</span>
                        <span className="truncate text-xs text-[var(--muted)]">{post.summary}</span>
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            <Command.Group heading={tCmd('groups.actions')}>
              <Command.Item
                value="action theme toggle"
                onSelect={() =>
                  runAndClose(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))
                }
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 text-[var(--muted)]" />
                ) : (
                  <Moon className="h-4 w-4 text-[var(--muted)]" />
                )}
                <span>{tCmd('actions.toggleTheme')}</span>
              </Command.Item>
              <Command.Item
                value="action locale switch"
                onSelect={() =>
                  runAndClose(() => {
                    const next: Locale = locale === 'zh' ? 'en' : 'zh';
                    router.replace(window.location.pathname, { locale: next });
                  })
                }
              >
                <Languages className="h-4 w-4 text-[var(--muted)]" />
                <span>{tCmd('actions.switchLocale')}</span>
              </Command.Item>
              <Command.Item
                value="action send email"
                onSelect={() =>
                  runAndClose(() => {
                    navigator.clipboard
                      .writeText('coderkyriewen@gmail.com')
                      .then(() => {
                        toast.success(locale === 'zh' ? '邮箱已复制' : 'Email copied!');
                      })
                      .catch(() => {});
                  })
                }
              >
                <Mail className="h-4 w-4 text-[var(--muted)]" />
                <span>{tCmd('actions.copyEmail')}</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading={locale === 'zh' ? '主题色' : 'Accent color'}>
              {ACCENTS.map((a) => (
                <Command.Item
                  key={a}
                  value={`accent ${a}`}
                  onSelect={() => runAndClose(() => setAccent(a))}
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-[var(--muted)]" />
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full ring-1 ring-[var(--border)]"
                      style={{ backgroundColor: ACCENT_SWATCH[a] }}
                    />
                  </span>
                  <span className="capitalize">{a}</span>
                  {accent === a && (
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {locale === 'zh' ? '当前' : 'current'}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading={tCmd('groups.social')}>
              {socialLinks.map((link) => (
                <Command.Item
                  key={link.href}
                  value={`social ${link.name}`}
                  onSelect={() => runAndClose(() => window.open(link.href, '_blank'))}
                >
                  <link.Icon className="h-4 w-4 text-[var(--muted)]" />
                  <span>{link.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
