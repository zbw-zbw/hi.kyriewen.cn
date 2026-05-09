import Image from 'next/image';
import { cn } from '@/lib/utils';

interface MediaFigureProps {
  /** 图片路径（public/ 下绝对路径，如 /projects/image-harvest/hero.png） */
  src: string;
  alt: string;
  /** 图片宽高，用于 next/image 占位 */
  width: number;
  height: number;
  /** 图注，显示在图片下方小字 */
  caption?: React.ReactNode;
  /** 视觉变体：default 普通 / wide 全宽 / framed 带阴影边框 */
  variant?: 'default' | 'wide' | 'framed';
  /** 是否优先加载（above the fold） */
  priority?: boolean;
  className?: string;
}

/**
 * 图片 / 视频 figure 容器。
 *
 * 用于 /projects/[slug] 详情页的 Hero Image、Gallery、Case Study 中。
 *
 * 设计原则：
 *  - 默认带 --shadow-soft，框感克制
 *  - framed 变体走 --shadow-elevated + --radius-2xl，做"产品展示位"
 *  - caption 用衬线字体，杂志感
 *
 * 用法：
 *   <MediaFigure src="/projects/image-harvest/hero.png" alt="..."
 *                width={1600} height={900} variant="framed"
 *                caption="Fig 01 — Image Harvest UI overview" priority />
 */
export function MediaFigure({
  src,
  alt,
  width,
  height,
  caption,
  variant = 'default',
  priority = false,
  className,
}: MediaFigureProps) {
  return (
    <figure className={cn('my-8 sm:my-12', className)}>
      <div
        className={cn(
          'overflow-hidden bg-[var(--card)]',
          variant === 'default' &&
            'rounded-[var(--radius-lg)] shadow-[var(--shadow-soft)]',
          variant === 'wide' && 'rounded-[var(--radius-xl)]',
          variant === 'framed' &&
            'rounded-[var(--radius-2xl)] border border-[var(--border)] shadow-[var(--shadow-elevated)]'
        )}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={variant === 'wide' ? '100vw' : '(max-width: 768px) 100vw, 768px'}
          className="h-auto w-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 font-[var(--font-serif)] text-sm italic text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
