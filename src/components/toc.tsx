'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/blog';
import { cn } from '@/lib/utils';

interface TocProps {
  entries: TocEntry[];
  locale: 'en' | 'zh';
}

export function Toc({ entries, locale }: TocProps) {
  // 首屏默认高亮第一个 entry，避免用户打开文章时 TOC 整列都是灰色无高亮。
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? '');

  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        // 取最靠近视口顶部且已进入的那条
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible.length > 0) {
          setActiveId(visible[0]!.target.id);
          return;
        }
        // 全部在视口外：回退到"视口顶部以上最近的一个"
        const above = observed
          .filter((entry) => entry.boundingClientRect.top < 0)
          .sort(
            (a, b) => b.boundingClientRect.top - a.boundingClientRect.top
          );
        if (above.length > 0) setActiveId(above[0]!.target.id);
      },
      {
        // 顶部留 80px 偏移（避开 sticky header），底部收紧
        rootMargin: '-80px 0px -66% 0px',
        threshold: [0, 1],
      }
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
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
        {locale === 'zh' ? '目录' : 'On this page'}
      </p>
      <ul className="space-y-1.5 border-l border-[var(--border)]">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={cn(
                  '-ml-px block border-l py-0.5 pl-3 leading-snug transition-colors',
                  entry.depth === 3 && 'pl-6',
                  isActive
                    ? 'border-[var(--accent)] text-[var(--fg)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
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
