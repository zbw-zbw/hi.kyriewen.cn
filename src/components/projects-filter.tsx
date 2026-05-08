'use client';

import { useMemo, useState } from 'react';
import type { Project, ProjectCategory } from '@/content/projects';
import { ProductCard } from '@/components/product-card';
import { cn } from '@/lib/utils';

interface ProjectsFilterProps {
  projects: Array<{ project: Project; stars?: number }>;
  locale: 'en' | 'zh';
}

type FilterValue = 'all' | ProjectCategory;

const CATEGORY_LABEL: Record<
  FilterValue,
  { en: string; zh: string }
> = {
  all: { en: 'All', zh: '全部' },
  'chrome-extension': { en: 'Chrome Extension', zh: 'Chrome 扩展' },
  'web-app': { en: 'Web App', zh: 'Web 应用' },
  library: { en: 'Library', zh: '开源库' },
};

export function ProjectsFilter({ projects, locale }: ProjectsFilterProps) {
  const [active, setActive] = useState<FilterValue>('all');

  // 根据数据实际出现的分类动态构造 chip 列表（避免空分类也出现）
  const availableFilters = useMemo<FilterValue[]>(() => {
    const set = new Set<ProjectCategory>();
    projects.forEach((p) => set.add(p.project.category));
    return ['all', ...Array.from(set)];
  }, [projects]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: projects.length };
    projects.forEach((p) => {
      map[p.project.category] = (map[p.project.category] ?? 0) + 1;
    });
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    if (active === 'all') return projects;
    return projects.filter((p) => p.project.category === active);
  }, [active, projects]);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label={locale === 'zh' ? '产品分类筛选' : 'Filter by category'}
        className="flex flex-wrap gap-2"
      >
        {availableFilters.map((value) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]'
              )}
            >
              <span>{CATEGORY_LABEL[value][locale]}</span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  selected ? 'opacity-80' : 'opacity-60'
                )}
              >
                {counts[value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {locale === 'zh'
            ? '该分类下暂无产品。'
            : 'No projects in this category yet.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(({ project, stars }) => (
            <ProductCard
              key={project.slug}
              project={project}
              locale={locale}
              stars={stars}
            />
          ))}
        </div>
      )}
    </div>
  );
}
