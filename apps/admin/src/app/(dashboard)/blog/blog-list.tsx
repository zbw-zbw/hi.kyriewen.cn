'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

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
  juejin: {
    label: '掘金',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  manual: {
    label: '手动',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

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
  const paginatedPosts = filteredPosts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected =
    paginatedPosts.length > 0 && paginatedPosts.every((p) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedPosts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedPosts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }, [allOnPageSelected, paginatedPosts]);

  const executeDelete = useCallback(async (postId: number) => {
    setDeleting(postId);
    try {
      const response = await fetch(`/api/blog/${postId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Failed to delete post');
      }
    } finally {
      setDeleting(null);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await executeDelete(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.title}"`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, executeDelete, router]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    setBatchDeleteOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const response = await fetch('/api/blog/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Batch delete failed');
      }
      const { deletedCount } = await response.json();
      toast.success(`Deleted ${deletedCount} posts`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch delete failed');
    }
    setSelectedIds(new Set());
    router.refresh();
  }, [selectedIds, executeDelete, router]);

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
          <div className="border-border flex gap-1 rounded-md border p-1">
            {(['all', 'en', 'zh'] as const).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setLangFilter(value);
                  setCurrentPage(1);
                }}
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
          <div className="border-border flex gap-1 rounded-md border p-1">
            {(['all', 'manual', 'csdn', 'juejin'] as const).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setSourceFilter(value);
                  setCurrentPage(1);
                }}
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
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBatchDeleteOpen(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => router.push('/blog/new')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Table (scrollable area) */}
      <div className="border-border min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/50 border-b">
              <th className="w-10 px-3 py-3">
                <span
                  role="checkbox"
                  aria-checked={allOnPageSelected}
                  tabIndex={0}
                  onClick={toggleSelectAll}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleSelectAll();
                    }
                  }}
                  className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    allOnPageSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-ring'
                  }`}
                >
                  {allOnPageSelected && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Title</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Source</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Lang</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">Updated</th>
              <th className="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-12 text-center">
                  No posts found.
                </td>
              </tr>
            ) : (
              paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className={`border-border hover:bg-muted/30 border-b transition-colors last:border-b-0 ${selectedIds.has(post.id) ? 'bg-muted/20' : ''}`}
                >
                  <td className="w-10 px-3 py-3">
                    <span
                      role="checkbox"
                      aria-checked={selectedIds.has(post.id)}
                      tabIndex={0}
                      onClick={() => toggleSelect(post.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleSelect(post.id);
                        }
                      }}
                      className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        selectedIds.has(post.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:border-ring'
                      }`}
                    >
                      {selectedIds.has(post.id) && (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </td>
                  <td className="max-w-75 truncate px-4 py-3 font-medium" title={post.title}>
                    {post.title}
                  </td>
                  <td className="px-4 py-3">{getSourceBadge(post.source)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-accent text-accent-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
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
                  <td className="text-muted-foreground px-4 py-3">{formatDate(post.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/blog/${post.id}`)}
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-1.5 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: post.id, title: post.title })}
                        disabled={deleting === post.id}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors disabled:opacity-50"
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
      <div className="border-border flex shrink-0 items-center justify-between border-t pt-3">
        <span className="text-muted-foreground text-sm">
          Page {safePage} of {totalPages} · {filteredPosts.length} posts
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Post"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Batch delete confirm */}
      <ConfirmDialog
        open={batchDeleteOpen}
        title="Batch Delete"
        description={`Are you sure you want to delete ${selectedIds.size} selected posts? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Posts`}
        variant="danger"
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </div>
  );
}
