'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TagBadge } from '@/components/tag-badge';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

const PAGE_SIZE = 10;

interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags?: string[];
}

interface BlogListProps {
  posts: BlogPost[];
  locale: Locale;
  emptyText: string;
  allLabel: string;
  /** 分页文案 */
  paginationLabels?: {
    prev: string;
    next: string;
    page: string;
    of: string;
    total: string;
  };
}

export function BlogList({ posts, locale, emptyText, allLabel, paginationLabels }: BlogListProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const allTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags ?? []) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!selectedTag) return posts;
    return posts.filter((post) => post.tags?.includes(selectedTag));
  }, [posts, selectedTag]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = filteredPosts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleTagChange = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1);
  };

  const labels = paginationLabels ?? {
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    of: 'of',
    total: 'posts',
  };

  return (
    <div className="space-y-6">
      {/* 标签筛选栏 */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleTagChange(null)}
            className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
              selectedTag === null
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]'
            }`}
          >
            {allLabel}
          </button>
          {allTags.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              active={selectedTag === tag}
              onClick={(clickedTag) =>
                handleTagChange(selectedTag === clickedTag ? null : clickedTag)
              }
            />
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {filteredPosts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)]">
            {paginatedPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  prefetch
                  className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <div className="flex-1 space-y-1">
                    <h2 className="font-medium group-hover:text-[var(--accent)]">{post.title}</h2>
                    <p className="text-sm text-[var(--muted-fg)]">{post.summary}</p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag) => (
                          <TagBadge key={tag} tag={tag} className="text-[10px]" />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                    {formatDate(post.date, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <span className="text-sm text-[var(--muted)]">
                {labels.page} {safePage} {labels.of} {totalPages} · {filteredPosts.length}{' '}
                {labels.total}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3 w-3" />
                  {labels.prev}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {labels.next}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
