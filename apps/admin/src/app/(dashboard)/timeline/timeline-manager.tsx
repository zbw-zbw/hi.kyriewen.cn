'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/* ── Constants ───────────────────────────────────────────────── */
const EVENT_TYPES = ['product', 'post', 'milestone', 'career'] as const;
type EventType = (typeof EVENT_TYPES)[number];

const TYPE_COLORS: Record<EventType, string> = {
  product: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  post: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  milestone:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  career:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
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
export default function TimelineManager({
  items,
}: {
  items: TimelineEvent[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [langTab, setLangTab] = useState<'en' | 'zh'>('en');

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

  /* ── Submit (create or update) ─────────────────────────────── */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !form.date.trim() ||
      !form.titleEn.trim() ||
      !form.titleZh.trim() ||
      !form.type.trim()
    ) {
      toast.error('Date, Title (EN), Title (ZH), and Type are required');
      return;
    }

    setLoading(true);
    const payload = {
      date: form.date.trim(),
      titleEn: form.titleEn.trim(),
      titleZh: form.titleZh.trim(),
      descriptionEn: form.descriptionEn.trim() || null,
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

      toast.success(
        isEdit ? 'Timeline event updated' : 'Timeline event created',
      );
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
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

      toast.success('Timeline event deleted');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Delete failed',
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} event{items.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          + Add New
        </button>
      </div>

      {/* ── Inline Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            {editingId !== null ? 'Edit Event' : 'New Event'}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {/* Date */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Date *</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Type */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Type *</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </select>
            </label>

            {/* Title EN */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Title (EN) *</span>
              <input
                type="text"
                value={form.titleEn}
                onChange={(e) =>
                  setForm({ ...form, titleEn: e.target.value })
                }
                placeholder="English title"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Title ZH */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Title (ZH) *</span>
              <input
                type="text"
                value={form.titleZh}
                onChange={(e) =>
                  setForm({ ...form, titleZh: e.target.value })
                }
                placeholder="中文标题"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Description EN */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Description (EN)</span>
              <textarea
                value={form.descriptionEn}
                onChange={(e) =>
                  setForm({ ...form, descriptionEn: e.target.value })
                }
                placeholder="English description (optional)"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Description ZH */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Description (ZH)</span>
              <textarea
                value={form.descriptionZh}
                onChange={(e) =>
                  setForm({ ...form, descriptionZh: e.target.value })
                }
                placeholder="中文描述（可选）"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* URL */}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">URL</span>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading
                  ? 'Saving…'
                  : editingId !== null
                    ? 'Update'
                    : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Language Tab ─────────────────────────────────────── */}
      <div className="flex gap-1 rounded-md border border-border p-1 w-fit">
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
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No timeline events yet. Click &quot;+ Add New&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {item.date}
                  </td>
                  <td className="px-4 py-3 max-w-[240px] truncate">
                    {langTab === 'en' ? item.titleEn : item.titleZh}
                  </td>
                  <td className="px-4 py-3 max-w-[300px] truncate text-muted-foreground">
                    {langTab === 'en'
                      ? item.descriptionEn || '—'
                      : item.descriptionZh || '—'}
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
                  <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
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
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="mr-2 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === item.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
