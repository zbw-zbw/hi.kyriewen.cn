'use client';

import { ArrowRight, Github, Star } from 'lucide-react';
import type { Project } from '@/content/projects';
import { Link } from '@/i18n/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  project: Project;
  locale: 'en' | 'zh';
  stars?: number;
  users?: number;
  /** 是否启用 per-project accent 色 hover 高亮（首页 featured 网格用 true） */
  highlighted?: boolean;
  className?: string;
}

const CATEGORY_LABEL: Record<Project['category'], { en: string; zh: string }> = {
  'chrome-extension': { en: 'Chrome Extension', zh: 'Chrome 扩展' },
  'web-app': { en: 'Web App', zh: 'Web 应用' },
  library: { en: 'Library', zh: '开源库' },
};

/**
 * 产品卡片：整卡可点跳转详情页，footer 里的 GitHub Source 用 stopPropagation 单独跳 repo。
 * 设计原则：用户点卡片任意区域 → /projects/[slug]；GitHub icon/Source → repo。
 * 移除了之前重复的右上角 ArrowUpRight（与 Source 按钮功能重复）。
 */
export function ProductCard({
  project,
  locale,
  stars,
  users,
  highlighted = false,
  className,
}: ProductCardProps) {
  const tagline = project.tagline[locale];
  const description = project.description[locale];
  const categoryLabel = CATEGORY_LABEL[project.category][locale];

  // per-project accent 色：用 inline style 注入 CSS 变量，hover 时让 border / glow 走 accent
  const accentStyle = project.accent
    ? ({ ['--card-accent']: project.accent } as React.CSSProperties)
    : undefined;

  // 阻止 footer 内的外链冒泡到外层 Link
  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Link
      href={`/projects/${project.slug}`}
      aria-label={`${project.name} — ${tagline}`}
      className="block cursor-pointer"
    >
      <Card
        style={accentStyle}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden transition-all duration-300',
          'hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]',
          highlighted && project.accent
            ? 'hover:border-[var(--card-accent,var(--accent))]'
            : 'hover:border-[var(--accent)]',
          className
        )}
      >
        <CardHeader className="gap-2 p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-[var(--muted)]">
                  {categoryLabel}
                </span>
              </div>
              <CardDescription>{tagline}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 p-5 pt-0">
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--card-fg)]">
            {description}
          </p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]"
              >
                {s}
              </span>
            ))}
          </div>
        </CardContent>

        <CardFooter className="items-center gap-4 border-t border-[var(--border)] p-5 pt-3 text-xs text-[var(--muted)]">
          {stars !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" /> {stars}
            </span>
          )}
          {users !== undefined && (
            <span>
              {users.toLocaleString()} {locale === 'zh' ? '用户' : 'users'}
            </span>
          )}
          {project.repo && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(project.repo!, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-[var(--fg)]"
              aria-label={`${project.name} source on GitHub`}
            >
              <Github className="h-3 w-3" />
              <span>Source</span>
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-[var(--fg)] transition-colors group-hover:text-[var(--accent)]">
            {locale === 'zh' ? '了解详情' : 'Read more'}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
