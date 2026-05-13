'use client';

import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailLinkProps {
  email?: string;
  /** 'inline'：行内文本风（散文里）；'pill'：footer 胶囊图标 */
  variant?: 'inline' | 'pill';
  /** 自定义显示文本 */
  label?: React.ReactNode;
  className?: string;
}

const DEFAULT_EMAIL = 'support@kyriewen.cn';

/**
 * 邮箱组件：点击调起 mailto:，不直接展示邮箱地址，hover 时 tooltip 展示。
 * 不提供复制按钮（复制功能由 CommandMenu 提供）。
 */
export function EmailLink({
  email = DEFAULT_EMAIL,
  variant = 'inline',
  label,
  className,
}: EmailLinkProps) {
  if (variant === 'inline') {
    return (
      <a
        href={`mailto:${email}`}
        title={email}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 text-[var(--muted)] transition-colors hover:text-[var(--fg)]',
          className
        )}
      >
        <Mail className="h-3.5 w-3.5" />
        {label && <span className="underline decoration-[var(--border)] decoration-1 underline-offset-4 transition-colors hover:decoration-[var(--accent)]">{label}</span>}
      </a>
    );
  }

  // pill: footer 风 — 只展示图标，hover tooltip 展示邮箱
  return (
    <a
      href={`mailto:${email}`}
      aria-label={`Email ${email}`}
      title={email}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 text-[var(--muted)] transition-colors hover:text-[var(--fg)]',
        className
      )}
    >
      <Mail className="h-4 w-4" />
    </a>
  );
}
