'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 全局右下角"返回顶部"按钮。
 * 滚动超过 600px 才出现；点击后平滑滚回顶部。
 * 响应 prefers-reduced-motion。
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={handleClick}
      className={cn(
        'fixed right-5 bottom-6 z-40 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full',
        'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] shadow-[var(--shadow-soft)]',
        'transition-all duration-300 hover:text-[var(--fg)] hover:shadow-[var(--shadow-elevated)]',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0'
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
