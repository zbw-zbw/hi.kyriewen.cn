'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/image-uploader';
import { TranslateButton } from '@/components/translate-button';

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
  const [copyTab, setCopyTab] = useState<'en' | 'zh'>('en');

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const openCreateForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCopyTab('en');
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: Project) => {
    setEditingId(item.id);
    setForm(projectToForm(item));
    setCopyTab('en');
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
    const payload = formToPayload(form);

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
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[cat] ?? 'bg-muted text-muted-foreground'}`}>
        {cat}
      </span>
    );
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} project{items.length !== 1 ? 's' : ''}
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
            {editingId !== null ? 'Edit Project' : 'New Project'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ─── Section A: Basic Info ──────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Basic Info
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Slug *</span>
                  <input type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} required className={inputClass} placeholder="my-project" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Name *</span>
                  <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required className={inputClass} placeholder="My Project" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Category *</span>
                  <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className={inputClass}>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Year *</span>
                  <input type="number" value={form.year} onChange={(e) => updateField('year', Number(e.target.value) || new Date().getFullYear())} required className={inputClass} />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Accent</span>
                  <input type="text" value={form.accent} onChange={(e) => updateField('accent', e.target.value)} className={inputClass} placeholder="#6366f1" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Color Theme</span>
                  <input type="text" value={form.colorTheme} onChange={(e) => updateField('colorTheme', e.target.value)} className={inputClass} placeholder="purple" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Sort Order</span>
                  <input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)} className={inputClass} />
                </label>
                <label className="flex items-center gap-2 self-end py-2">
                  <input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} className="size-4 rounded border-input" />
                  <span className={labelClass}>Featured</span>
                </label>
                <label className="flex items-center gap-2 self-end py-2">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => updateField('pinned', e.target.checked)} className="size-4 rounded border-input" />
                  <span className={labelClass}>Pinned</span>
                </label>
              </div>
            </fieldset>

            {/* ─── Section B: Copy (EN / ZH Tabs) ────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Copy
              </legend>
              <div className="flex gap-2 border-b border-border">
                <button type="button" onClick={() => setCopyTab('en')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${copyTab === 'en' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  English
                </button>
                <button type="button" onClick={() => setCopyTab('zh')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${copyTab === 'zh' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  中文
                </button>
              </div>
              {copyTab === 'en' ? (
                <div className="grid gap-4">
                  <label className="space-y-1.5">
                    <span className={labelClass}>Tagline (EN)</span>
                    <input type="text" value={form.taglineEn} onChange={(e) => updateField('taglineEn', e.target.value)} className={inputClass} placeholder="A short tagline" />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Description (EN)</span>
                    <textarea value={form.descriptionEn} onChange={(e) => updateField('descriptionEn', e.target.value)} rows={3} className={inputClass} placeholder="Project description..." />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Case Study (EN)</span>
                    <textarea value={form.caseStudyEn} onChange={(e) => updateField('caseStudyEn', e.target.value)} rows={4} className={inputClass} placeholder="Detailed case study (Markdown)..." />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Tagline (ZH)</span>
                      <TranslateButton text={form.taglineZh} type="title" onTranslated={(v) => { updateField('taglineEn', v); setCopyTab('en'); }} />
                    </div>
                    <input type="text" value={form.taglineZh} onChange={(e) => updateField('taglineZh', e.target.value)} className={inputClass} placeholder="简短标语" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Description (ZH)</span>
                      <TranslateButton text={form.descriptionZh} type="description" onTranslated={(v) => { updateField('descriptionEn', v); setCopyTab('en'); }} />
                    </div>
                    <textarea value={form.descriptionZh} onChange={(e) => updateField('descriptionZh', e.target.value)} rows={3} className={inputClass} placeholder="项目描述..." />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Case Study (ZH)</span>
                      <TranslateButton text={form.caseStudyZh} type="article" onTranslated={(v) => { updateField('caseStudyEn', v); setCopyTab('en'); }} />
                    </div>
                    <textarea value={form.caseStudyZh} onChange={(e) => updateField('caseStudyZh', e.target.value)} rows={4} className={inputClass} placeholder="详细案例（Markdown）..." />
                  </div>
                </div>
              )}
            </fieldset>

            {/* ─── Section C: Links ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Links
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Repo URL</span>
                  <input type="text" value={form.repo} onChange={(e) => updateField('repo', e.target.value)} className={inputClass} placeholder="https://github.com/..." />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Live URL</span>
                  <input type="text" value={form.live} onChange={(e) => updateField('live', e.target.value)} className={inputClass} placeholder="https://..." />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Chrome Store ID</span>
                  <input type="text" value={form.chromeStoreId} onChange={(e) => updateField('chromeStoreId', e.target.value)} className={inputClass} placeholder="abc123..." />
                </label>
              </div>
            </fieldset>

            {/* ─── Section D: Media ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
                  <input type="text" value={form.coverVideo} onChange={(e) => updateField('coverVideo', e.target.value)} className={inputClass} placeholder="https://..." />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className={labelClass}>Gallery URLs (comma-separated)</span>
                  <textarea value={form.galleryText} onChange={(e) => updateField('galleryText', e.target.value)} rows={2} className={inputClass} placeholder="https://img1.jpg, https://img2.jpg" />
                </label>
              </div>
            </fieldset>

            {/* ─── Section E: Stack ──────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Tech Stack
              </legend>
              <label className="space-y-1.5">
                <span className={labelClass}>Stack (comma-separated)</span>
                <input type="text" value={form.stackText} onChange={(e) => updateField('stackText', e.target.value)} className={inputClass} placeholder="Next.js, React, Tailwind CSS" />
              </label>
            </fieldset>

            {/* ─── Section F: Metrics ────────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Metrics
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1.5">
                  <span className={labelClass}>Users</span>
                  <input type="number" value={form.metricsUsers} onChange={(e) => updateField('metricsUsers', e.target.value)} className={inputClass} placeholder="0" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Stars</span>
                  <input type="number" value={form.metricsStars} onChange={(e) => updateField('metricsStars', e.target.value)} className={inputClass} placeholder="0" />
                </label>
                <label className="space-y-1.5">
                  <span className={labelClass}>Rating</span>
                  <input type="number" value={form.metricsRating} onChange={(e) => updateField('metricsRating', e.target.value)} className={inputClass} placeholder="4.5" step="0.1" />
                </label>
              </div>
            </fieldset>

            {/* ─── Section G: Changelog ──────────────────────── */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Changelog
              </legend>
              <label className="space-y-1.5">
                <span className={labelClass}>Changelog JSON</span>
                <textarea value={form.changelogText} onChange={(e) => updateField('changelogText', e.target.value)} rows={4} className={`${inputClass} font-mono text-xs`} placeholder='[{"version": "1.0", "date": "2024-01-01", "changes": ["Initial release"]}]' />
              </label>
            </fieldset>

            {/* ─── Actions ───────────────────────────────────── */}
            <div className="flex gap-2 border-t border-border pt-4">
              <button type="submit" disabled={loading} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {loading ? 'Saving…' : editingId !== null ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={closeForm} className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No projects yet. Click &quot;Add New&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
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
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{categoryBadge(item.category)}</td>
                  <td className="px-4 py-3 text-center">{item.year}</td>
                  <td className="px-4 py-3 text-center space-x-1">
                    {item.featured === 1 && <span title="Featured">⭐</span>}
                    {item.pinned === 1 && <span title="Pinned">📌</span>}
                    {item.featured !== 1 && item.pinned !== 1 && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.slug}</td>
                  <td className="px-4 py-3 text-center">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => openEditForm(item)} className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
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
