'use client';

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Trash2, Loader2, MessageSquare, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAdminLocale } from '@/components/locale-provider';

interface Message {
  id: number;
  userId: string;
  name: string;
  avatar: string | null;
  body: string;
  parentId: number | null;
  postSlug: string | null;
  createdAt: string;
}

type FilterType = 'all' | 'guestbook' | 'blog';

export default function GuestbookManager({
  initialMessages,
  initialTotal,
}: {
  initialMessages: Message[];
  initialTotal: number;
}) {
  const { t } = useAdminLocale();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [loading, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const fetchMessages = (type: FilterType, p: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/guestbook?type=${type}&page=${p}&limit=50`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages(data.data);
        setTotal(data.pagination.total);
        setSelectedIds(new Set());
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  const handleFilter = (type: FilterType) => {
    setFilter(type);
    setPage(1);
    fetchMessages(type, 1);
  };

  const executeDelete = useCallback(async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/guestbook/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => prev.filter((m) => m.id !== id && m.parentId !== id));
      setTotal((prev) => prev - 1);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget === null) return;
    try {
      await executeDelete(deleteTarget);
      toast.success(t('guestbook.toastDeleted'));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, executeDelete]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    setBatchDeleteOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch('/api/guestbook/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Batch delete failed');
      }
      const { deletedCount } = await res.json();
      toast.success(t('guestbook.toastBatchDeleted').replace('{count}', String(deletedCount)));
      setMessages((prev) =>
        prev.filter((m) => !ids.includes(m.id) && !ids.includes(m.parentId ?? -1)),
      );
      setTotal((prev) => prev - deletedCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch delete failed');
    }
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchMessages(filter, p);
  };

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allSelected = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }, [messages, selectedIds]);

  const allSelected = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Filter tabs + batch actions */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          {(['all', 'guestbook', 'blog'] as FilterType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleFilter(type)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {type === 'all'
                ? t('guestbook.filterAll')
                : type === 'guestbook'
                  ? t('guestbook.filterGuestbook')
                  : t('guestbook.filterBlogComments')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Select all */}
          <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs">
            <span
              role="checkbox"
              aria-checked={allSelected}
              tabIndex={0}
              onClick={toggleSelectAll}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleSelectAll();
                }
              }}
              className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                allSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:border-ring'
              }`}
            >
              {allSelected && (
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
            {t('guestbook.selectAll')}
          </label>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setBatchDeleteOpen(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('guestbook.batchDelete').replace('{count}', String(selectedIds.size))}
            </button>
          )}
        </div>
      </div>

      {/* Messages list (scrollable) */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-card flex-1 rounded-lg border p-8 text-center">
          <MessageSquare className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('guestbook.empty')}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`hover:bg-muted/30 flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                msg.parentId ? 'ml-8 border-dashed' : ''
              } ${selectedIds.has(msg.id) ? 'border-primary/50 bg-muted/20' : 'bg-card'}`}
            >
              {/* Checkbox */}
              <span
                role="checkbox"
                aria-checked={selectedIds.has(msg.id)}
                tabIndex={0}
                onClick={() => toggleSelect(msg.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleSelect(msg.id);
                  }
                }}
                className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  selectedIds.has(msg.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-ring'
                }`}
              >
                {selectedIds.has(msg.id) && (
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

              {/* Avatar */}
              {msg.avatar ? (
                <Image
                  src={msg.avatar}
                  alt={msg.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                  unoptimized
                />
              ) : (
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                  {msg.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{msg.name}</span>
                  {msg.postSlug && (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
                      {msg.postSlug}
                    </span>
                  )}
                  {msg.parentId && (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                      {t('guestbook.reply')}
                    </span>
                  )}
                  <time className="text-muted-foreground ml-auto text-xs">
                    {new Date(msg.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">{msg.body}</p>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDeleteTarget(msg.id)}
                disabled={deletingId === msg.id}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-md p-1.5 transition-colors disabled:opacity-50"
              >
                {deletingId === msg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination (sticky bottom) */}
      <div className="border-border flex shrink-0 items-center justify-between border-t pt-3">
        <span className="text-muted-foreground text-sm">
          Page {page} of {totalPages} · {total} messages
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> {t('common.prev')}
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="border-border hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('guestbook.deleteTitle')}
        description={t('guestbook.deleteDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Batch delete confirm */}
      <ConfirmDialog
        open={batchDeleteOpen}
        title={t('guestbook.batchDeleteTitle')}
        description={t('guestbook.deleteDesc')}
        confirmLabel={t('guestbook.batchDelete').replace('{count}', String(selectedIds.size))}
        variant="danger"
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </div>
  );
}
