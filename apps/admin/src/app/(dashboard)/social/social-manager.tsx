'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAdminLocale } from '@/components/locale-provider';

/* ── Lucide icon name options ────────────────────────────────── */
const ICON_OPTIONS = [
  'Github',
  'Twitter',
  'Mail',
  'Rss',
  'Linkedin',
  'Youtube',
  'Instagram',
  'Facebook',
  'Globe',
  'MessageCircle',
  'Send',
  'AtSign',
  'Link',
  'Twitch',
  'Codepen',
  'Figma',
  'Dribbble',
  'ExternalLink',
] as const;

/* ── Types ───────────────────────────────────────────────────── */
interface SocialLink {
  id: number;
  name: string;
  href: string;
  iconName: string;
  handle: string | null;
  isEmail: number;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FormData {
  name: string;
  href: string;
  iconName: string;
  handle: string;
  isEmail: boolean;
  sortOrder: number;
}

const EMPTY_FORM: FormData = {
  name: '',
  href: '',
  iconName: 'Github',
  handle: '',
  isEmail: false,
  sortOrder: 0,
};

/* ── Component ───────────────────────────────────────────────── */
const PAGE_SIZE = 20;

export default function SocialManager({ items }: { items: SocialLink[] }) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: SocialLink) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      href: item.href,
      iconName: item.iconName,
      handle: item.handle ?? '',
      isEmail: item.isEmail === 1,
      sortOrder: item.sortOrder,
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
    if (!form.name.trim() || !form.href.trim() || !form.iconName.trim()) {
      toast.error(t('social.requiredFields'));
      return;
    }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      href: form.href.trim(),
      iconName: form.iconName.trim(),
      handle: form.handle.trim() || null,
      isEmail: form.isEmail ? 1 : 0,
      sortOrder: form.sortOrder,
    };

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/social/${editingId}` : '/api/social';
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

      toast.success(isEdit ? t('social.toastUpdated') : t('social.toastCreated'));
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/social/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success(t('social.toastDeleted'));
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
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('page.social.title')}</h2>
        <p className="text-muted-foreground">{t('page.social.desc')}</p>
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {items.length} social link{items.length !== 1 ? 's' : ''}
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
            {editingId !== null ? t('social.editTitle') : t('social.newTitle')}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('social.fieldName')}</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. GitHub"
                required
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* URL */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('social.fieldUrl')}</span>
              <input
                type="text"
                value={form.href}
                onChange={(event) => setForm({ ...form, href: event.target.value })}
                placeholder="https://github.com/username"
                required
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Icon Name */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('social.fieldIcon')}</span>
              <select
                value={form.iconName}
                onChange={(event) => setForm({ ...form, iconName: event.target.value })}
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>

            {/* Handle */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('social.fieldHandle')}</span>
              <input
                type="text"
                value={form.handle}
                onChange={(event) => setForm({ ...form, handle: event.target.value })}
                placeholder="@username"
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Sort Order */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t('common.sortOrder')}</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: Number(event.target.value) || 0 })
                }
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>

            {/* Is Email */}
            <label className="flex items-center gap-2 self-end py-2">
              <input
                type="checkbox"
                checked={form.isEmail}
                onChange={(event) => setForm({ ...form, isEmail: event.target.checked })}
                className="border-input size-4 rounded"
              />
              <span className="text-sm font-medium">{t('social.isEmailLink')}</span>
            </label>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
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
                className="border-input hover:bg-accent inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          {t('social.empty')}
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-border bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('social.colName')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('social.colUrl')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('social.colIcon')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('social.colHandle')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('social.colEmail')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('social.colOrder')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="text-muted-foreground max-w-[200px] truncate px-4 py-3">
                    {item.href}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-muted inline-flex rounded px-2 py-0.5 font-mono text-xs">
                      {item.iconName}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{item.handle || '—'}</td>
                  <td className="px-4 py-3 text-center">{item.isEmail === 1 ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-center">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        className="text-primary hover:bg-primary/10 rounded px-2 py-1 text-xs font-medium transition-colors"
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
                    </div>
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
