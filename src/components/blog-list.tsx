'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { TagBadge } from '@/components/tag-badge';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

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
}

export function BlogList({ posts, locale, emptyText, allLabel }: BlogListProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* 标签筛选栏 */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
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
                setSelectedTag((prev) =>
                  prev === clickedTag ? null : clickedTag
                )
              }
            />
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {filteredPosts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {filteredPosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                prefetch
                className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div className="flex-1 space-y-1">
                  <h2 className="font-medium group-hover:text-[var(--accent)]">
                    {post.title}
                  </h2>
                  <p className="text-sm text-[var(--muted-fg)]">
                    {post.summary}
                  </p>
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
      )}
    </div>
  );
}
