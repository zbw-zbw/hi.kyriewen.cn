'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  tags: string[];
  lang: string;
  draft: number;
  coverImage: string | null;
  source: string | null;
  sourceUrl: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type LangFilter = 'all' | 'en' | 'zh';
type SourceFilter = 'all' | 'manual' | 'csdn' | 'juejin';

const PAGE_SIZE = 20;

interface BlogListProps {
  posts: BlogPost[];
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  csdn: { label: 'CSDN', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  juejin: { label: '掘金', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  manual: { label: '手动', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

function getSourceBadge(source: string | null) {
  const key = source || 'manual';
  const config = SOURCE_LABELS[key] ?? SOURCE_LABELS.manual!;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export function BlogList({ posts }: BlogListProps) {
  const router = useRouter();
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncArticles = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'sync-articles' }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Sync failed');
      }
      toast.success('Articles synced! Refresh to see new posts.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [router]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (langFilter !== 'all' && post.lang !== langFilter) return false;
      if (sourceFilter !== 'all') {
        const postSource = post.source || 'manual';
        if (postSource !== sourceFilter) return false;
      }
      return true;
    });
  }, [posts, langFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleDelete = useCallback(
    async (postId: number, postTitle: string) => {
      if (!confirm(`Delete "${postTitle}"? This cannot be undone.`)) return;

      setDeleting(postId);
      try {
        const response = await fetch(`/api/blog/${postId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? 'Failed to delete post');
        }

        toast.success(`Deleted "${postTitle}"`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete post'
        );
      } finally {
        setDeleting(null);
      }
    },
    [router]
  );

  function formatDate(date: Date | string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Language filter */}
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(['all', 'en', 'zh'] as const).map((value) => (
              <button
                key={value}
                onClick={() => { setLangFilter(value); setCurrentPage(1); }}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  langFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {value === 'all' ? 'All' : value.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(['all', 'manual', 'csdn', 'juejin'] as const).map((value) => (
              <button
                key={value}
                onClick={() => { setSourceFilter(value); setCurrentPage(1); }}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  sourceFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {value === 'all' ? 'All Sources' : (SOURCE_LABELS[value]?.label ?? value)}
              </button>
            ))}
          </div>

          {/* Total count */}
          <span className="text-sm text-muted-foreground">
            {filteredPosts.length} posts
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync articles button */}
          <button
            onClick={handleSyncArticles}
            disabled={syncing}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync Articles'}
          </button>

          {/* New post button */}
          <button
            onClick={() => router.push('/blog/new')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Table (scrollable area) */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Source
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Lang
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Updated
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedPosts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No posts found.
                </td>
              </tr>
            ) : (
              paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  <td className="max-w-75 truncate px-4 py-3 font-medium" title={post.title}>
                    {post.title}
                  </td>
                  <td className="px-4 py-3">
                    {getSourceBadge(post.source)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {post.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {post.draft ? (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Published
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/blog/${post.id}`)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={deleting === post.id}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (sticky bottom) */}
      <div className="flex shrink-0 items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages} · {filteredPosts.length} posts
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
