'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAdminLocale } from '@/components/locale-provider';

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
type SourceFilter = 'all' | 'manual' | 'juejin' | 'file';

const PAGE_SIZE = 20;

interface BlogListProps {
  posts: BlogPost[];
}

const SOURCE_COLORS: Record<string, { key: string; color: string }> = {
  juejin: {
    key: 'blog.sourceJuejin',
    color: 'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  manual: {
    key: 'blog.sourceManual',
    color: 'bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  file: {
    key: 'blog.sourceFile',
    color: 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
};

export function BlogList({ posts }: BlogListProps) {
  const router = useRouter();
  const { locale, t } = useAdminLocale();
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [titleSearch, setTitleSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchPublishOpen, setBatchPublishOpen] = useState(false);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (langFilter !== 'all' && post.lang !== langFilter) return false;
      if (sourceFilter !== 'all') {
        const postSource = post.source || 'manual';
        if (postSource !== sourceFilter) return false;
      }
      if (titleSearch.trim()) {
        const query = titleSearch.toLowerCase();
        if (!post.title.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [posts, langFilter, sourceFilter, titleSearch]);

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
      toast.success(t('blog.toastDeleted').replace('{title}', deleteTarget.title));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('blog.toastDeleteFailed'));
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
        throw new Error(errorData.error ?? t('blog.toastBatchDeleteFailed'));
      }
      const { deletedCount } = await response.json();
      toast.success(t('blog.toastBatchDeleted').replace('{count}', String(deletedCount)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('blog.toastBatchDeleteFailed'));
    }
    setSelectedIds(new Set());
    router.refresh();
  }, [selectedIds, router]);

  const handleBatchPublishConfirm = useCallback(async () => {
    setBatchPublishOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const response = await fetch('/api/blog/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? t('blog.toastBatchPublishFailed'));
      }
      const { publishedCount } = await response.json();
      toast.success(t('blog.toastBatchPublished').replace('{count}', String(publishedCount)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('blog.toastBatchPublishFailed'));
    }
    setSelectedIds(new Set());
    router.refresh();
  }, [selectedIds, router]);

  function formatDate(date: Date | string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('page.blog.title')}</h2>
        <p className="text-muted-foreground">{t('page.blog.desc')}</p>
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">{/* 过滤器已移到表头列 */}</div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setBatchPublishOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <Send className="h-4 w-4" />
                {t('blog.batchPublish').replace('{count}', String(selectedIds.size))}
              </button>
              <button
                onClick={() => setBatchDeleteOpen(true)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {t('blog.batchDelete').replace('{count}', String(selectedIds.size))}
              </button>
            </>
          )}
          <button
            onClick={() => router.push('/blog/new')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('blog.newPost')}
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
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                <div className="flex items-center gap-2">
                  <span>{t('blog.colTitle')}</span>
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => {
                      setTitleSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('blog.searchPlaceholder')}
                    className="border-border bg-background focus:ring-ring w-32 rounded border px-2 py-0.5 text-xs font-normal outline-none focus:ring-1"
                  />
                </div>
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value as SourceFilter);
                    setCurrentPage(1);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer appearance-none border-none bg-transparent text-sm font-medium outline-none"
                >
                  <option value="all">{t('blog.filterSource')}</option>
                  <option value="manual">{t('blog.sourceManual')}</option>
                  <option value="juejin">{t('blog.sourceJuejin')}</option>
                  <option value="file">{t('blog.sourceFile')}</option>
                </select>
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                <select
                  value={langFilter}
                  onChange={(e) => {
                    setLangFilter(e.target.value as LangFilter);
                    setCurrentPage(1);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer appearance-none border-none bg-transparent text-sm font-medium outline-none"
                >
                  <option value="all">{t('blog.filterLang')}</option>
                  <option value="en">EN</option>
                  <option value="zh">ZH</option>
                </select>
              </th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">{t('blog.colStatus')}</th>
              <th className="text-muted-foreground px-4 py-3 text-left font-medium">{t('blog.colUpdated')}</th>
              <th className="text-muted-foreground px-4 py-3 text-right font-medium">{t('blog.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-12 text-center">
                  {t('blog.noPostsFound')}
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
                  <td className="px-4 py-3">{(() => {
                    const sk = post.source || 'manual';
                    const cfg = SOURCE_COLORS[sk] ?? SOURCE_COLORS.manual!;
                    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{t(cfg.key)}</span>;
                  })()}</td>
                  <td className="px-4 py-3">
                    <span className="bg-accent text-accent-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                      {post.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {post.draft ? (
                      <span className="inline-flex rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {t('blog.statusDraft')}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {t('blog.statusPublished')}
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{formatDate(post.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/blog/${post.id}`)}
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-1.5 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: post.id, title: post.title })}
                        disabled={deleting === post.id}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors disabled:opacity-50"
                        title={t('common.delete')}
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
          {t('common.pagination').replace('{page}', String(safePage)).replace('{total}', String(totalPages)).replace('{count}', String(filteredPosts.length))}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> {t('common.prev')}
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('blog.deletePostTitle')}
        description={
          deleteTarget ? t('blog.deletePostDesc').replace('{title}', deleteTarget.title) : ''
        }
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Batch delete confirm */}
      <ConfirmDialog
        open={batchDeleteOpen}
        title={t('blog.batchDeleteTitle')}
        description={t('blog.batchDeleteDesc').replace('{count}', String(selectedIds.size))}
        confirmLabel={t('blog.batchDeleteConfirm').replace('{count}', String(selectedIds.size))}
        variant="danger"
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteOpen(false)}
      />

      {/* Batch publish confirm */}
      <ConfirmDialog
        open={batchPublishOpen}
        title={t('blog.batchPublishTitle')}
        description={t('blog.batchPublishDesc').replace('{count}', String(selectedIds.size))}
        confirmLabel={t('blog.batchPublishConfirm').replace('{count}', String(selectedIds.size))}
        onConfirm={handleBatchPublishConfirm}
        onCancel={() => setBatchPublishOpen(false)}
      />
    </div>
  );
}
