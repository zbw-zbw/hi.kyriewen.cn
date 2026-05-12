'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAdminLocale } from '@/components/locale-provider';

/* ── Types ───────────────────────────────────────────────────── */
interface NavigationItem {
  id: number;
  href: string;
  key: string;
  labelEn: string;
  labelZh: string;
  visible: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  href: string;
  key: string;
  labelZh: string;
  labelEn: string;
  sortOrder: number;
}

const EMPTY_FORM: FormData = { href: '', key: '', labelZh: '', labelEn: '', sortOrder: 0 };

/* ── Component ───────────────────────────────────────────────── */
export default function NavigationPage() {
  const { locale, t } = useAdminLocale();
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [langTab, setLangTab] = useState<'en' | 'zh'>(locale);

  /* ── Fetch items ───────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch('/api/navigation');
      if (!response.ok) throw new Error('Failed to fetch navigation items');
      const json = await response.json();
      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setItems(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Form helpers ──────────────────────────────────────────── */
  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: NavigationItem) => {
    setEditingId(item.id);
    setForm({
      href: item.href,
      key: item.key,
      labelZh: item.labelZh ?? '',
      labelEn: item.labelEn ?? '',
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
    if (!form.href.trim() || !form.key.trim()) {
      toast.error('Href and Key are required');
      return;
    }

    setSubmitting(true);

    // Auto-translate labelZh → labelEn if labelZh is provided and labelEn is empty
    let labelEn = form.labelEn.trim();
    const labelZh = form.labelZh.trim();
    if (labelZh && !labelEn) {
      try {
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [{ text: labelZh, type: 'title', field: 'labelZh' }] }),
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          const r = trData.results?.[0];
          if (r?.translated) labelEn = r.translated;
        }
      } catch {
        /* non-blocking */
      }
    }

    const payload = {
      href: form.href.trim(),
      key: form.key.trim(),
      labelEn,
      labelZh,
      sortOrder: form.sortOrder,
    };

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/navigation/${editingId}` : '/api/navigation';
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

      toast.success(isEdit ? 'Navigation item updated' : 'Navigation item created');
      closeForm();
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Toggle visibility ─────────────────────────────────────── */
  const handleToggleVisibility = async (item: NavigationItem) => {
    try {
      const response = await fetch(`/api/navigation/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: item.visible === 1 ? 0 : 1 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Toggle failed');
      }

      toast.success(`Navigation item ${item.visible === 1 ? 'hidden' : 'shown'}`);
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Toggle failed');
    }
  };

  /* ── Delete ────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/navigation/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success('Navigation item deleted');
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">Loading…</div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Navigation</h2>
        <p className="text-muted-foreground">Manage your site navigation menu items.</p>
      </div>

      <div className="space-y-6">
        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {items.length} navigation item{items.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors"
          >
            + Add New
          </button>
        </div>

        {/* ── Inline Form ──────────────────────────────────────── */}
        {showForm && (
          <div className="border-border bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">
              {editingId !== null ? 'Edit Navigation Item' : 'New Navigation Item'}
            </h3>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {/* Href */}
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Href *</span>
                <input
                  type="text"
                  value={form.href}
                  onChange={(event) => setForm({ ...form, href: event.target.value })}
                  placeholder="/about"
                  required
                  className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </label>

              {/* Key */}
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Key *</span>
                <input
                  type="text"
                  value={form.key}
                  onChange={(event) => setForm({ ...form, key: event.target.value })}
                  placeholder="about"
                  required
                  className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </label>

              {/* Label ZH (中文标签，保存时自动翻译英文) */}
              <label className="space-y-1.5">
                <span className="text-sm font-medium">中文标签</span>
                <input
                  type="text"
                  value={form.labelZh}
                  onChange={(event) => setForm({ ...form, labelZh: event.target.value })}
                  placeholder="关于"
                  className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </label>

              {/* Label EN */}
              <label className="space-y-1.5">
                <span className="text-sm font-medium">
                  English Label{' '}
                  <span className="text-muted-foreground text-xs">(auto-translated if empty)</span>
                </span>
                <input
                  type="text"
                  value={form.labelEn}
                  onChange={(event) => setForm({ ...form, labelEn: event.target.value })}
                  placeholder="About"
                  className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
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
                  className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </label>

              {/* Actions */}
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="border-input hover:bg-accent inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Language Tab ──────────────────────────────────────── */}
        <div className="bg-muted flex w-fit gap-1 rounded-lg p-1">
          {(['en', 'zh'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLangTab(lang)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                langTab === lang
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {lang === 'en' ? 'EN' : 'ZH'}
            </button>
          ))}
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            No navigation items yet. Click &quot;Add New&quot; to create one.
          </div>
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-border bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Href</th>
                  <th className="px-4 py-3 text-left font-medium">
                    {langTab === 'en' ? 'Label (EN)' : '标签 (ZH)'}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Visible</th>
                  <th className="px-4 py-3 text-center font-medium">Order</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <span className="bg-muted inline-flex rounded px-2 py-0.5 font-mono text-xs">
                        {item.key}
                      </span>
                    </td>
                    <td className="text-muted-foreground max-w-[200px] truncate px-4 py-3">
                      {item.href}
                    </td>
                    <td className="px-4 py-3">
                      {langTab === 'en'
                        ? item.labelEn || <span className="text-muted-foreground italic">—</span>
                        : item.labelZh || <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(item)}
                        className="inline-flex items-center gap-2"
                      >
                        <span
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                            item.visible === 1 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                              item.visible === 1 ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            item.visible === 1
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.visible === 1 ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">{item.sortOrder}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="text-primary hover:bg-primary/10 rounded px-2 py-1 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-destructive hover:bg-destructive/10 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
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
    </div>
  );
}
