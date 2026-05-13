'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAdminLocale } from '@/components/locale-provider';

/* ── Constants ───────────────────────────────────────────────── */
const EVENT_TYPES = ['product', 'post', 'milestone', 'career'] as const;
type EventType = (typeof EVENT_TYPES)[number];

const TYPE_COLORS: Record<EventType, string> = {
  product: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  post: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  milestone: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  career: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

/* ── Types ───────────────────────────────────────────────────── */
interface TimelineEvent {
  id: number;
  date: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  type: string;
  url: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FormData {
  date: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  type: string;
  url: string;
}

const EMPTY_FORM: FormData = {
  date: '',
  titleEn: '',
  titleZh: '',
  descriptionEn: '',
  descriptionZh: '',
  type: 'milestone',
  url: '',
};

/* ── Component ───────────────────────────────────────────────── */
const PAGE_SIZE = 20;

export default function TimelineManager({ items }: { items: TimelineEvent[] }) {
  const router = useRouter();
  const { locale, t } = useAdminLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [langTab, setLangTab] = useState<'en' | 'zh'>(locale);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: TimelineEvent) => {
    setEditingId(item.id);
    setForm({
      date: item.date,
      titleEn: item.titleEn,
      titleZh: item.titleZh,
      descriptionEn: item.descriptionEn ?? '',
      descriptionZh: item.descriptionZh ?? '',
      type: item.type,
      url: item.url ?? '',
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  /* ── Submit (create or update) — auto-translate zh→en ─────── */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date.trim() || !form.titleZh.trim() || !form.type.trim()) {
      toast.error(t('timeline.requiredFields'));
      return;
    }

    setLoading(true);

    // Auto-translate Chinese fields to English
    let titleEn = form.titleEn.trim();
    let descriptionEn = form.descriptionEn.trim() || null;

    if (form.titleZh.trim()) {
      try {
        const textsToTranslate = [
          { text: form.titleZh.trim(), type: 'title', field: 'titleZh' },
          ...(form.descriptionZh.trim()
            ? [{ text: form.descriptionZh.trim(), type: 'description', field: 'descriptionZh' }]
            : []),
        ];
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textsToTranslate }),
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          for (const r of trData.results ?? []) {
            if (r.field === 'titleZh') titleEn = r.translated;
            if (r.field === 'descriptionZh') descriptionEn = r.translated;
          }
        }
      } catch {
        toast.error('自动翻译失败，将使用中文值作为英文');
        if (!titleEn) titleEn = form.titleZh.trim();
      }
    }

    const payload = {
      date: form.date.trim(),
      titleEn,
      titleZh: form.titleZh.trim(),
      descriptionEn,
      descriptionZh: form.descriptionZh.trim() || null,
      type: form.type.trim(),
      url: form.url.trim() || null,
    };

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/timeline/${editingId}` : '/api/timeline';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }

      toast.success(isEdit ? t('timeline.updated') : t('timeline.created'));
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/timeline/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success(t('timeline.deleted'));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {items.length} event{items.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={openCreateForm}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors"
        >
          {t('common.addNew')}
        </button>
      </div>

      {/* ── Inline Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="border-border bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            {editingId !== null ? t('timeline.editTitle') : t('timeline.newTitle')}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {/* Date */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('timeline.fieldDate')}</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Type */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('timeline.fieldType')}</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </label>

            {/* Title ZH (auto-translate to EN on save) */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">标题 *</span>
              <input
                type="text"
                value={form.titleZh}
                onChange={(e) => setForm({ ...form, titleZh: e.target.value })}
                placeholder="中文标题（保存时自动翻译英文）"
                required
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Description ZH (auto-translate to EN on save) */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">描述</span>
              <textarea
                value={form.descriptionZh}
                onChange={(e) => setForm({ ...form, descriptionZh: e.target.value })}
                placeholder="中文描述（可选）"
                rows={3}
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* URL */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">{t('timeline.fieldUrl')}</span>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com (optional)"
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {loading
                  ? t('common.saving')
                  : editingId !== null
                    ? t('common.update')
                    : t('common.create')}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="border-input hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Language Tab ─────────────────────────────────────── */}
      <div className="border-border flex w-fit gap-1 rounded-md border p-1">
        <button
          type="button"
          onClick={() => setLangTab('en')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            langTab === 'en'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLangTab('zh')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            langTab === 'zh'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ZH
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          {t('timeline.empty')}
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium">{t('timeline.colDate')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('timeline.colTitle')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('timeline.colDesc')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('timeline.colType')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('timeline.colUrl')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{item.date}</td>
                  <td className="max-w-[240px] truncate px-4 py-3">
                    {langTab === 'en' ? item.titleEn : item.titleZh}
                  </td>
                  <td className="text-muted-foreground max-w-[300px] truncate px-4 py-3">
                    {langTab === 'en' ? item.descriptionEn || '—' : item.descriptionZh || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TYPE_COLORS[item.type as EventType] ??
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="text-muted-foreground max-w-[180px] truncate px-4 py-3">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {item.url}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="text-primary hover:bg-primary/10 mr-2 rounded px-2 py-1 text-xs font-medium transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-destructive hover:bg-destructive/10 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingId === item.id ? t('common.deleting') : t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {items.length > PAGE_SIZE && (
        <div className="border-border flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-sm">
            Page {safePage} of {totalPages} · {items.length} items
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {t('common.prev')}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
