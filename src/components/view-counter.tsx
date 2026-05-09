'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewCounterProps {
  slug: string;
  /** 是否在挂载时自动记录一次浏览 */
  trackView?: boolean;
  className?: string;
}

/**
 * 浏览量计数器：挂载时可选地 POST 一次浏览量，然后展示当前计数。
 * 在数据库不可用时优雅降级（不显示数字）。
 */
export function ViewCounter({
  slug,
  trackView = false,
  className,
}: ViewCounterProps) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    if (trackView) {
      fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.views === 'number') setViews(data.views);
        })
        .catch(() => {});
    } else {
      fetch(`/api/views?slugs=${encodeURIComponent(slug)}`)
        .then((res) => res.json())
        .then((data) => {
          const count = data.views?.[slug];
          if (typeof count === 'number') setViews(count);
        })
        .catch(() => {});
    }
  }, [slug, trackView]);

  if (views === null) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs text-[var(--muted)]',
        className
      )}
      title={`${views} views`}
    >
      <Eye className="h-3 w-3" />
      {views.toLocaleString()}
    </span>
  );
}
