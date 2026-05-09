import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  /** 章节编号，例如 "01"。会渲染为左上小字 "FIG 01"，启用 Linear 风杂志感。 */
  index?: string;
  /** 编号后的小字标签，例如 "PRODUCTS"。如果不传，会用 title 大写代替。 */
  eyebrow?: string;
  /** 章节大字标题。 */
  title: string;
  /** 副标题（散文化一句话），可选。 */
  subtitle?: string;
  /** 右侧操作区（如 "All →" 链接），可选。 */
  action?: React.ReactNode;
  /** 视觉变体：default 紧凑款 / display 大字款。 */
  variant?: 'default' | 'display';
  className?: string;
}

/**
 * 章节标题组件 — 支持 Linear 风 FIG 01/02/03 章节编号系统。
 *
 * 用法示例：
 *   <SectionHeading index="01" eyebrow="Selected Work" title="Things I made" />
 *   <SectionHeading index="02" eyebrow="Writing" title="Latest Writing" action={<Link>...</Link>} />
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  subtitle,
  action,
  variant = 'default',
  className,
}: SectionHeadingProps) {
  const eyebrowText = eyebrow ?? (index ? title : undefined);

  return (
    <div className={cn('mb-8 sm:mb-10', className)}>
      {/* 编号 + Eyebrow 小字 */}
      {(index || eyebrowText) && (
        <div className="mb-4 flex items-center gap-3 font-mono text-[var(--text-eyebrow)] uppercase tracking-[0.18em] text-[var(--muted)]">
          {index && (
            <span className="tabular-nums">
              FIG <span className="text-[var(--fg)]">{index}</span>
            </span>
          )}
          {index && eyebrowText && (
            <span className="h-px w-6 bg-[var(--border)]" aria-hidden />
          )}
          {eyebrowText && <span>{eyebrowText}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2
            className={cn(
              'font-semibold tracking-tight text-[var(--fg)]',
              variant === 'display'
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : 'text-2xl sm:text-3xl'
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="max-w-prose text-sm text-[var(--muted)] sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
