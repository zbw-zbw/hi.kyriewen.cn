'use client';

import { useState } from 'react';
import { Copy, Check, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface EmailLinkProps {
  email?: string;
  /** 'inline'：行内文本风（散文里）；'pill'：footer 胶囊 + 复制按钮 */
  variant?: 'inline' | 'pill';
  /** 自定义显示文本，默认就是 email 本身 */
  label?: React.ReactNode;
  className?: string;
}

const DEFAULT_EMAIL = 'coderkyriewen@gmail.com';

/**
 * 邮箱组件：左键直接 mailto: 调起邮件客户端，右侧附带 复制 按钮。
 * 解决"点邮箱没反应/反而被复制"的问题。
 */
export function EmailLink({
  email = DEFAULT_EMAIL,
  variant = 'inline',
  label,
  className,
}: EmailLinkProps) {
  const t = useTranslations('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1', className)}>
        <a
          href={`mailto:${email}`}
          className="cursor-pointer underline decoration-[var(--border)] decoration-1 underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
        >
          {label ?? email}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? t('copied') : t('copy')}
          title={copied ? t('copied') : t('copy')}
          className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </span>
    );
  }

  // pill: footer 风
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <a
        href={`mailto:${email}`}
        aria-label={`Email ${email}`}
        title={`Email ${email}`}
        className="inline-flex cursor-pointer items-center gap-1.5 transition-colors hover:text-[var(--fg)]"
      >
        <Mail className="h-4 w-4" />
        <span className="font-mono text-xs">{label ?? email}</span>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? t('copied') : t('copy')}
        title={copied ? t('copied') : t('copy')}
        className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}
