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
  Copy,
  Github,
  Twitter,
  BookOpen,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export interface SearchablePost {
  slug: string;
  title: string;
  summary: string;
  tags?: string[];
  date: string;
}

const PAGES = [
  { href: '/', key: 'home', Icon: Home },
  { href: '/projects', key: 'projects', Icon: Package },
  { href: '/blog', key: 'blog', Icon: FileText },
  { href: '/now', key: 'now', Icon: Activity },
  { href: '/stats', key: 'stats', Icon: BarChart3 },
  { href: '/timeline', key: 'timeline', Icon: Clock },
  { href: '/uses', key: 'uses', Icon: Wrench },
  { href: '/guestbook', key: 'guestbook', Icon: MessageSquare },
] as const;

const SOCIAL = [
  { href: 'https://github.com/zbw-zbw', label: 'GitHub', Icon: Github },
  { href: 'https://x.com/kyriewen', label: 'Twitter / X', Icon: Twitter },
];

export function CommandMenu({ posts = [] }: { posts?: SearchablePost[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
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
            '[&_[cmdk-empty]]:py-8 [&_[cmdk-empty]]:text-center [&_[cmdk-empty]]:text-sm [&_[cmdk-empty]]:text-[var(--muted)]'
          )}
        >
          <Command.Input placeholder={tCmd('placeholder')} />
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty>{tCmd('noResults')}</Command.Empty>

            <Command.Group heading={tCmd('groups.navigation')}>
              {PAGES.map(({ href, key, Icon }) => (
                <Command.Item
                  key={href}
                  value={`nav ${key} ${tNav(key)}`}
                  onSelect={() => runAndClose(() => router.push(href))}
                  onMouseEnter={() => router.prefetch(href)}
                >
                  <Icon className="h-4 w-4 text-[var(--muted)]" />
                  <span>{tNav(key)}</span>
                </Command.Item>
              ))}
            </Command.Group>

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
                        <span className="truncate text-xs text-[var(--muted)]">
                          {post.summary}
                        </span>
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
                  runAndClose(() =>
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                  )
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
                value="action copy email"
                onSelect={() =>
                  runAndClose(() => {
                    navigator.clipboard
                      ?.writeText('hi@kyriewen.cn')
                      .catch(() => null);
                  })
                }
              >
                <Copy className="h-4 w-4 text-[var(--muted)]" />
                <span>{tCmd('actions.copyEmail')}</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading={tCmd('groups.social')}>
              {SOCIAL.map(({ href, label, Icon }) => (
                <Command.Item
                  key={href}
                  value={`social ${label}`}
                  onSelect={() =>
                    runAndClose(() => window.open(href, '_blank'))
                  }
                >
                  <Icon className="h-4 w-4 text-[var(--muted)]" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
