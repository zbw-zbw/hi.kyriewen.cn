'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TocEntry } from '@/lib/blog';
import { cn } from '@/lib/utils';

/** 滚动偏移量：导航栏(56px) + 吸顶返回按钮区域(~76px) = 132px */
const STICKY_OFFSET = 132;

interface TocProps {
  entries: TocEntry[];
  locale: 'en' | 'zh';
}

export function Toc({ entries, locale }: TocProps) {
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? '');

  /** 点击目录项：使用 scrollIntoView 滚动，不改变 URL（不影响浏览器返回） */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      event.preventDefault();
      const element = document.getElementById(targetId);
      if (!element) return;

      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - STICKY_OFFSET,
        behavior: 'smooth',
      });
      setActiveId(targetId);
    },
    [],
  );

  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0]!.target.id);
          return;
        }
        const above = observed
          .filter((entry) => entry.boundingClientRect.top < 0)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);
        if (above.length > 0) setActiveId(above[0]!.target.id);
      },
      {
        rootMargin: `-${STICKY_OFFSET}px 0px -66% 0px`,
        threshold: [0, 1],
      },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav
      aria-label={locale === 'zh' ? '文章目录' : 'Table of contents'}
      className="sticky top-16 hidden max-h-[calc(100vh-5rem)] w-56 shrink-0 self-start overflow-y-auto pl-6 text-sm lg:block"
    >
      <p className="mb-3 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
        {locale === 'zh' ? '目录' : 'On this page'}
      </p>
      <ul className="space-y-1.5 border-l border-[var(--border)]">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                onClick={(e) => handleClick(e, entry.id)}
                className={cn(
                  '-ml-px block cursor-pointer border-l py-0.5 pl-3 leading-snug transition-colors',
                  entry.depth === 3 && 'pl-6',
                  isActive
                    ? 'border-[var(--accent)] text-[var(--fg)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]',
                )}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
