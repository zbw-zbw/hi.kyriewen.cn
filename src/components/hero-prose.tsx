import { cn } from '@/lib/utils';

interface HeroProseProps {
  /** 顶部小字 eyebrow（如 "Software Engineer · Hangzhou"），可选。 */
  eyebrow?: React.ReactNode;
  /** 散文段落主体。建议 100–150 字，把 Now Playing / 项目 / 博客做成行内链接。 */
  children: React.ReactNode;
  /** 底部辅助行（如 CTA / 社交 icons），可选。 */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * 散文式 Hero 容器（Lee Robinson 风）。
 *
 * 设计原则：
 *  - 不用副标题段落、不用按钮组（行业最新共识）
 *  - 字号走 fluid `--text-hero`，自动适配 360–1920px
 *  - 行高 1.65–1.75，适合长段散文
 *  - 颜色用 muted-fg 让链接 / 强调元素自然跳出来
 *
 * 用法：
 *   <HeroProse eyebrow="Software Engineer">
 *     <p>I'm Kyriewen, building <Link href="/projects/image-harvest">Image Harvest</Link>{' '}
 *        and 5 other tools. Currently listening to <NowPlayingInline />.</p>
 *   </HeroProse>
 */
export function HeroProse({
  eyebrow,
  children,
  footer,
  className,
}: HeroProseProps) {
  return (
    <section
      className={cn(
        'relative pt-12 pb-12 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20',
        className
      )}
    >
      {eyebrow && (
        <div className="mb-6 font-mono text-[var(--text-eyebrow)] uppercase tracking-[0.18em] text-[var(--muted)]">
          {eyebrow}
        </div>
      )}

      <div
        className={cn(
          'max-w-[60ch] font-[var(--font-display)] font-normal leading-[1.65] tracking-normal text-[var(--fg)]',
          'text-[length:var(--text-hero)]'
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          {footer}
        </div>
      )}
    </section>
  );
}
