'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Menu, X, Github, Twitter, Mail, Rss } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** 与 header.tsx NAV_ITEMS 保持同步排序 */
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
  { href: '/subscribe', key: 'subscribe' },
] as const;

const SOCIAL = [
  { href: 'https://github.com/zbw-zbw', label: 'GitHub', Icon: Github },
  { href: 'https://x.com/kyriewen', label: 'Twitter / X', Icon: Twitter },
  { href: 'mailto:coderkyriewen@gmail.com', label: 'Email', Icon: Mail },
  { href: '/rss.xml', label: 'RSS', Icon: Rss },
];

/**
 * 全屏抽屉式移动端导航。
 * 使用 Portal 将遮罩 & 面板渲染到 document.body，
 * 避免 header 的 backdrop-blur 创建的 stacking context 吞掉 z-index。
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('nav');
  const pathname = usePathname();

  // 确保仅在客户端渲染 portal
  useEffect(() => setMounted(true), []);

  // 路由变化时关闭
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 打开时锁定 body 滚动 + ESC 关闭
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggleMenu = useCallback(() => setOpen((prev) => !prev), []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const overlay = open && mounted
    ? createPortal(
        <>
          {/* 背景遮罩 — 全屏 */}
          <div
            className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* 导航面板 — 从 header 底部到屏幕底部 */}
          <div
            className="fixed top-[3.5rem] right-0 bottom-0 left-0 z-[100] flex flex-col overflow-hidden bg-[var(--bg)] md:hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* 顶部关闭按钮 */}
            <div className="flex items-center justify-end px-4 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav
              className="flex-1 overflow-y-auto px-6 pt-2 pb-4"
              aria-label="Mobile navigation"
            >
              <ul className="space-y-0.5">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-3 text-lg font-semibold tracking-tight transition-colors',
                        isActive(item.href)
                          ? 'bg-[var(--card)] text-[var(--fg)]'
                          : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--fg)]'
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-[var(--border)] px-6 py-5">
              <div className="flex items-center gap-5">
                {SOCIAL.map(({ href, label, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={
                      href.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    aria-label={label}
                    className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={toggleMenu}
        className="relative z-[101] inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)] md:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {overlay}
    </>
  );
}
