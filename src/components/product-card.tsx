import { ArrowUpRight, Github, Star } from 'lucide-react';
import type { Project } from '@/content/projects';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  project: Project;
  locale: 'en' | 'zh';
  stars?: number;
  users?: number;
  className?: string;
}

const CATEGORY_LABEL: Record<Project['category'], { en: string; zh: string }> = {
  'chrome-extension': { en: 'Chrome Extension', zh: 'Chrome 扩展' },
  'web-app': { en: 'Web App', zh: 'Web 应用' },
  library: { en: 'Library', zh: '开源库' },
};

export function ProductCard({
  project,
  locale,
  stars,
  users,
  className,
}: ProductCardProps) {
  const tagline = project.tagline[locale];
  const description = project.description[locale];
  const categoryLabel = CATEGORY_LABEL[project.category][locale];

  return (
    <Card
      className={cn(
        'group relative flex flex-col gap-3 p-5 transition-all hover:border-[var(--accent)] hover:shadow-lg',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold tracking-tight">{project.name}</h3>
            <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {categoryLabel}
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">{tagline}</p>
        </div>
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.name} on GitHub`}
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>

      <p className="text-sm leading-relaxed">{description}</p>

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

      {(stars !== undefined || users !== undefined || project.repo) && (
        <div className="flex items-center gap-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
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
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 hover:text-[var(--fg)]"
            >
              <Github className="h-3 w-3" />
              <span>Source</span>
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
