'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

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
export default function SocialManager({ items }: { items: SocialLink[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      toast.error('Name, URL, and Icon are required');
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

      toast.success(isEdit ? 'Social link updated' : 'Social link created');
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
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

      toast.success('Social link deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
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
          {items.length} social link{items.length !== 1 ? 's' : ''}
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
            {editingId !== null ? 'Edit Social Link' : 'New Social Link'}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. GitHub"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* URL */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">URL *</span>
              <input
                type="text"
                value={form.href}
                onChange={(event) => setForm({ ...form, href: event.target.value })}
                placeholder="https://github.com/username"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Icon Name */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Icon *</span>
              <select
                value={form.iconName}
                onChange={(event) => setForm({ ...form, iconName: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
              <span className="text-sm font-medium">Handle</span>
              <input
                type="text"
                value={form.handle}
                onChange={(event) => setForm({ ...form, handle: event.target.value })}
                placeholder="@username"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Sort Order */}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Sort Order</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: Number(event.target.value) || 0 })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Is Email */}
            <label className="flex items-center gap-2 self-end py-2">
              <input
                type="checkbox"
                checked={form.isEmail}
                onChange={(event) => setForm({ ...form, isEmail: event.target.checked })}
                className="size-4 rounded border-input"
              />
              <span className="text-sm font-medium">Is Email Link</span>
            </label>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No social links yet. Click &quot;Add New&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-left font-medium">Icon</th>
                <th className="px-4 py-3 text-left font-medium">Handle</th>
                <th className="px-4 py-3 text-center font-medium">Email</th>
                <th className="px-4 py-3 text-center font-medium">Order</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                    {item.href}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-mono">
                      {item.iconName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.handle || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isEmail === 1 ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
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
                    </div>
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
