'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/image-uploader';

/* ── Constants ───────────────────────────────────────────────── */
const CATEGORY_OPTIONS = ['chrome-extension', 'web-app', 'library'] as const;

/* ── Types ───────────────────────────────────────────────────── */
interface Project {
  id: number;
  slug: string;
  name: string;
  category: string;
  taglineEn: string | null;
  taglineZh: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  stack: string[] | null;
  repo: string | null;
  live: string | null;
  chromeStoreId: string | null;
  featured: number;
  pinned: number;
  year: number;
  accent: string | null;
  heroImage: string | null;
  gallery: string[] | null;
  coverVideo: string | null;
  caseStudyEn: string | null;
  caseStudyZh: string | null;
  colorTheme: string | null;
  metrics: { users?: number; stars?: number; rating?: number } | null;
  changelog: unknown[] | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FormData {
  slug: string;
  name: string;
  category: string;
  year: number;
  featured: boolean;
  pinned: boolean;
  accent: string;
  colorTheme: string;
  sortOrder: number;
  taglineEn: string;
  taglineZh: string;
  descriptionEn: string;
  descriptionZh: string;
  caseStudyEn: string;
  caseStudyZh: string;
  repo: string;
  live: string;
  chromeStoreId: string;
  heroImage: string;
  galleryText: string;
  coverVideo: string;
  stackText: string;
  metricsUsers: string;
  metricsStars: string;
  metricsRating: string;
  changelogText: string;
}

const EMPTY_FORM: FormData = {
  slug: '',
  name: '',
  category: 'web-app',
  year: new Date().getFullYear(),
  featured: false,
  pinned: false,
  accent: '',
  colorTheme: '',
  sortOrder: 0,
  taglineEn: '',
  taglineZh: '',
  descriptionEn: '',
  descriptionZh: '',
  caseStudyEn: '',
  caseStudyZh: '',
  repo: '',
  live: '',
  chromeStoreId: '',
  heroImage: '',
  galleryText: '',
  coverVideo: '',
  stackText: '',
  metricsUsers: '',
  metricsStars: '',
  metricsRating: '',
  changelogText: '',
};

/* ── Helpers ─────────────────────────────────────────────────── */
function projectToForm(item: Project): FormData {
  return {
    slug: item.slug,
    name: item.name,
    category: item.category,
    year: item.year,
    featured: item.featured === 1,
    pinned: item.pinned === 1,
    accent: item.accent ?? '',
    colorTheme: item.colorTheme ?? '',
    sortOrder: item.sortOrder,
    taglineEn: item.taglineEn ?? '',
    taglineZh: item.taglineZh ?? '',
    descriptionEn: item.descriptionEn ?? '',
    descriptionZh: item.descriptionZh ?? '',
    caseStudyEn: item.caseStudyEn ?? '',
    caseStudyZh: item.caseStudyZh ?? '',
    repo: item.repo ?? '',
    live: item.live ?? '',
    chromeStoreId: item.chromeStoreId ?? '',
    heroImage: item.heroImage ?? '',
    galleryText: item.gallery ? item.gallery.join(', ') : '',
    coverVideo: item.coverVideo ?? '',
    stackText: item.stack ? item.stack.join(', ') : '',
    metricsUsers: item.metrics?.users?.toString() ?? '',
    metricsStars: item.metrics?.stars?.toString() ?? '',
    metricsRating: item.metrics?.rating?.toString() ?? '',
    changelogText: item.changelog ? JSON.stringify(item.changelog, null, 2) : '',
  };
}

function formToPayload(form: FormData) {
  const stackArray = form.stackText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const galleryArray = form.galleryText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const metrics: Record<string, number> = {};
  if (form.metricsUsers) metrics.users = Number(form.metricsUsers);
  if (form.metricsStars) metrics.stars = Number(form.metricsStars);
  if (form.metricsRating) metrics.rating = Number(form.metricsRating);

  let changelog: unknown[] | null = null;
  if (form.changelogText.trim()) {
    try {
      changelog = JSON.parse(form.changelogText);
    } catch {
      changelog = null;
    }
  }

  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    category: form.category,
    year: form.year,
    featured: form.featured ? 1 : 0,
    pinned: form.pinned ? 1 : 0,
    accent: form.accent.trim() || null,
    colorTheme: form.colorTheme.trim() || null,
    sortOrder: form.sortOrder,
    taglineEn: form.taglineEn.trim() || null,
    taglineZh: form.taglineZh.trim() || null,
    descriptionEn: form.descriptionEn.trim() || null,
    descriptionZh: form.descriptionZh.trim() || null,
    caseStudyEn: form.caseStudyEn.trim() || null,
    caseStudyZh: form.caseStudyZh.trim() || null,
    repo: form.repo.trim() || null,
    live: form.live.trim() || null,
    chromeStoreId: form.chromeStoreId.trim() || null,
    heroImage: form.heroImage.trim() || null,
    gallery: galleryArray.length > 0 ? galleryArray : null,
    coverVideo: form.coverVideo.trim() || null,
    stack: stackArray.length > 0 ? stackArray : null,
    metrics: Object.keys(metrics).length > 0 ? metrics : null,
    changelog,
  };
}

/* ── Reusable input class ────────────────────────────────────── */
const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'text-sm font-medium';

/* ── Component ───────────────────────────────────────────────── */
export default function ProjectsManager({ items }: { items: Project[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: Project) => {
    setEditingId(item.id);
    setForm(projectToForm(item));
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  /* ── Submit ────────────────────────────────────────────────── */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.slug.trim() || !form.name.trim() || !form.category) {
      toast.error('Slug, Name, and Category are required');
      return;
    }

    setLoading(true);

    // Auto-translate zh → en fields before saving
    const translatedForm = { ...form };
    const textsToTranslate = [
      ...(form.taglineZh.trim()
        ? [{ text: form.taglineZh.trim(), type: 'title', field: 'taglineZh' }]
        : []),
      ...(form.descriptionZh.trim()
        ? [{ text: form.descriptionZh.trim(), type: 'description', field: 'descriptionZh' }]
        : []),
      ...(form.caseStudyZh.trim()
        ? [{ text: form.caseStudyZh.trim(), type: 'article', field: 'caseStudyZh' }]
        : []),
    ];
    if (textsToTranslate.length > 0) {
      try {
        const trRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textsToTranslate }),
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          for (const r of trData.results ?? []) {
            if (r.field === 'taglineZh') translatedForm.taglineEn = r.translated;
            if (r.field === 'descriptionZh') translatedForm.descriptionEn = r.translated;
            if (r.field === 'caseStudyZh') translatedForm.caseStudyEn = r.translated;
          }
        }
      } catch {
        /* non-blocking */
      }
    }

    const payload = formToPayload(translatedForm);

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/projects/${editingId}` : '/api/projects';
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

      toast.success(isEdit ? 'Project updated' : 'Project created');
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
    if (!confirm('Are you sure you want to delete this project?')) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Delete failed');
      }
      toast.success('Project deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Category badge color ──────────────────────────────────── */
  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      'chrome-extension': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'web-app': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      library: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[cat] ?? 'bg-muted text-muted-foreground'}`}
      >
        {cat}
      </span>
    );
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {items.length} project{items.length !== 1 ? 's' : ''}
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
            {editingId !== null ? 'Edit Project' : 'New Project'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ─── Section A: Basic Info ──────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Basic Info
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Slug *</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    required
                    className={inputClass}
                    placeholder="my-project"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Name *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    className={inputClass}
                    placeholder="My Project"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Category *</span>
                  <select
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Year *</span>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) =>
                      updateField('year', Number(e.target.value) || new Date().getFullYear())
                    }
                    required
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Accent</span>
                  <input
                    type="text"
                    value={form.accent}
                    onChange={(e) => updateField('accent', e.target.value)}
                    className={inputClass}
                    placeholder="#6366f1"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Color Theme</span>
                  <input
                    type="text"
                    value={form.colorTheme}
                    onChange={(e) => updateField('colorTheme', e.target.value)}
                    className={inputClass}
                    placeholder="purple"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Sort Order</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)}
                    className={inputClass}
                  />
                </label>
                <label className="flex items-center gap-2 self-end py-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                    className="border-input size-4 rounded"
                  />
                  <span className={labelClass}>Featured</span>
                </label>
                <label className="flex items-center gap-2 self-end py-2">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) => updateField('pinned', e.target.checked)}
                    className="border-input size-4 rounded"
                  />
                  <span className={labelClass}>Pinned</span>
                </label>
              </div>
            </fieldset>

            {/* ─── Section B: Copy (ZH only, auto-translate EN on save) ── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                文案（保存时自动翻译英文）
              </legend>
              <div className="grid gap-4">
                <label className="space-y-1.5">
                  <span className={labelClass}>标语</span>
                  <input
                    type="text"
                    value={form.taglineZh}
                    onChange={(e) => updateField('taglineZh', e.target.value)}
                    className={inputClass}
                    placeholder="简短标语"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>描述</span>
                  <textarea
                    value={form.descriptionZh}
                    onChange={(e) => updateField('descriptionZh', e.target.value)}
                    rows={3}
                    className={inputClass}
                    placeholder="项目描述..."
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>案例（Markdown）</span>
                  <textarea
                    value={form.caseStudyZh}
                    onChange={(e) => updateField('caseStudyZh', e.target.value)}
                    rows={4}
                    className={inputClass}
                    placeholder="详细案例..."
                  />
                </label>
              </div>
            </fieldset>

            {/* ─── Section C: Links ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Links
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Repo URL</span>
                  <input
                    type="text"
                    value={form.repo}
                    onChange={(e) => updateField('repo', e.target.value)}
                    className={inputClass}
                    placeholder="https://github.com/..."
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Live URL</span>
                  <input
                    type="text"
                    value={form.live}
                    onChange={(e) => updateField('live', e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Chrome Store ID</span>
                  <input
                    type="text"
                    value={form.chromeStoreId}
                    onChange={(e) => updateField('chromeStoreId', e.target.value)}
                    className={inputClass}
                    placeholder="abc123..."
                  />
                </label>
              </div>
            </fieldset>

            {/* ─── Section D: Media ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Media
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className={labelClass}>Hero Image</span>
                  <ImageUploader
                    value={form.heroImage}
                    onChange={(url) => updateField('heroImage', url)}
                    prefix="projects"
                  />
                </div>
                <label className="space-y-1.5">
                  <span className={labelClass}>Cover Video URL</span>
                  <input
                    type="text"
                    value={form.coverVideo}
                    onChange={(e) => updateField('coverVideo', e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className={labelClass}>Gallery URLs (comma-separated)</span>
                  <textarea
                    value={form.galleryText}
                    onChange={(e) => updateField('galleryText', e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="https://img1.jpg, https://img2.jpg"
                  />
                </label>
              </div>
            </fieldset>

            {/* ─── Section E: Stack ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Tech Stack
              </legend>
              <label className="space-y-1.5">
                <span className={labelClass}>Stack (comma-separated)</span>
                <input
                  type="text"
                  value={form.stackText}
                  onChange={(e) => updateField('stackText', e.target.value)}
                  className={inputClass}
                  placeholder="Next.js, React, Tailwind CSS"
                />
              </label>
            </fieldset>

            {/* ─── Section F: Metrics ────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Metrics
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Users</span>
                  <input
                    type="number"
                    value={form.metricsUsers}
                    onChange={(e) => updateField('metricsUsers', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Stars</span>
                  <input
                    type="number"
                    value={form.metricsStars}
                    onChange={(e) => updateField('metricsStars', e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Rating</span>
                  <input
                    type="number"
                    value={form.metricsRating}
                    onChange={(e) => updateField('metricsRating', e.target.value)}
                    className={inputClass}
                    placeholder="4.5"
                    step="0.1"
                  />
                </label>
              </div>
            </fieldset>

            {/* ─── Section G: Changelog ──────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Changelog
              </legend>
              <label className="space-y-1.5">
                <span className={labelClass}>Changelog JSON</span>
                <textarea
                  value={form.changelogText}
                  onChange={(e) => updateField('changelogText', e.target.value)}
                  rows={4}
                  className={`${inputClass} font-mono text-xs`}
                  placeholder='[{"version": "1.0", "date": "2024-01-01", "changes": ["Initial release"]}]'
                />
              </label>
            </fieldset>

            {/* ─── Actions ───────────────────────────────────── */}
            <div className="border-border flex gap-2 border-t pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
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

      {/* ── Table ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          No projects yet. Click &quot;Add New&quot; to create one.
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-border bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-center font-medium">Year</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-center font-medium">Order</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{categoryBadge(item.category)}</td>
                  <td className="px-4 py-3 text-center">{item.year}</td>
                  <td className="space-x-1 px-4 py-3 text-center">
                    {item.featured === 1 && <span title="Featured">⭐</span>}
                    {item.pinned === 1 && <span title="Pinned">📌</span>}
                    {item.featured !== 1 && item.pinned !== 1 && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{item.slug}</td>
                  <td className="px-4 py-3 text-center">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        {deletingId === item.id ? '…' : 'Delete'}
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
