'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, Pencil, Trash2, Plus, X } from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

type PopularPost = {
  id: number;
  slug: string;
  views: number | null;
  trend: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BlogPostOption = {
  slug: string;
  title: string;
  lang: string;
};

type FormData = {
  slug: string;
  views: number;
  trend: string;
};

const EMPTY_FORM: FormData = { slug: '', views: 0, trend: 'flat' };

function TrendIcon({ trend }: { trend: string | null }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="text-muted-foreground h-4 w-4" />;
  }
}

function TrendLabel({ trend, t }: { trend: string | null; t: (key: string) => string }) {
  switch (trend) {
    case 'up':
      return <span className="text-green-500">{t('popular.trendUp')}</span>;
    case 'down':
      return <span className="text-red-500">{t('popular.trendDown')}</span>;
    default:
      return <span className="text-muted-foreground">{t('popular.trendFlat')}</span>;
  }
}

export function PopularManager({
  initialData,
  initialBlogPosts,
  initialViewsMap,
}: {
  initialData: PopularPost[];
  initialBlogPosts: BlogPostOption[];
  initialViewsMap: Record<string, number>;
}) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const blogPosts = initialBlogPosts;
  const viewsMap = initialViewsMap;
  const [slugSearch, setSlugSearch] = useState('');
  const [showSlugDropdown, setShowSlugDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSlugDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 选择文章后自动填充浏览量（使用服务端传入的 viewsMap，避免请求主站 API）
  function selectPost(post: BlogPostOption) {
    setFormData((prev) => ({ ...prev, slug: post.slug }));
    setSelectedLang(post.lang);
    setSlugSearch(post.title);
    setShowSlugDropdown(false);

    // 从服务端预加载的 viewsMap 中获取浏览量
    const viewCount = viewsMap[`blog/${post.slug}`];
    if (typeof viewCount === 'number') {
      setFormData((prev) => ({ ...prev, views: viewCount }));
    }
  }

  // 已添加到热门的 slug 集合
  const existingSlugs = new Set(initialData.map((p) => p.slug));

  // 过滤可选的文章列表（只显示已发布的、排除已添加的）
  const filteredBlogPosts = blogPosts.filter((post) => {
    if (existingSlugs.has(post.slug) && editingId === null) return false;
    if (!slugSearch.trim()) return true;
    const query = slugSearch.toLowerCase();
    return post.title.toLowerCase().includes(query) || post.slug.toLowerCase().includes(query);
  });

  // 根据 slug 查找文章标题
  function getTitleBySlug(slug: string): string {
    const found = blogPosts.find((p) => p.slug === slug);
    return found?.title ?? slug;
  }

  function openCreateForm() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setSlugSearch('');
    setShowForm(true);
  }

  function openEditForm(post: PopularPost) {
    setEditingId(post.id);
    setFormData({
      slug: post.slug,
      views: post.views ?? 0,
      trend: post.trend ?? 'flat',
    });
    setSelectedLang('');
    setSlugSearch('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setSelectedLang('');
    setSlugSearch('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `/api/popular/${editingId}` : '/api/popular';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Request failed');
      }

      toast.success(isEditing ? t('popular.toastUpdated') : t('popular.toastCreated'));
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(postId: number) {
    if (!confirm(t('popular.confirmDelete'))) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/popular/${postId}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Delete failed');
      }

      toast.success(t('popular.toastDeleted'));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('page.popular.title')}</h2>
          <p className="text-muted-foreground">{t('page.popular.desc')}</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('popular.addPost')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border-border bg-background rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId !== null ? t('popular.editTitle') : t('popular.newTitle')}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="relative space-y-1.5" ref={dropdownRef}>
              <label htmlFor="slug" className="text-sm font-medium">
                {t('popular.selectPost')}
              </label>
              <input
                id="slug"
                type="text"
                required
                value={slugSearch || getTitleBySlug(formData.slug)}
                onChange={(event) => {
                  setSlugSearch(event.target.value);
                  setShowSlugDropdown(true);
                }}
                onFocus={() => setShowSlugDropdown(true)}
                placeholder={t('popular.searchPlaceholder')}
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
              {/* hidden input 存储真正的 slug 值 */}
              <input type="hidden" name="slug" value={formData.slug} />
              {showSlugDropdown && filteredBlogPosts.length > 0 && (
                <div className="border-border bg-background absolute top-full left-0 z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-lg">
                  {filteredBlogPosts.map((post) => (
                    <button
                      key={`${post.slug}-${post.lang}`}
                      type="button"
                      onClick={() => selectPost(post)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                        formData.slug === post.slug && selectedLang === post.lang
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="truncate">{post.title}</span>
                      <span className="bg-muted text-muted-foreground ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase">
                        {post.lang}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="views" className="text-sm font-medium">
                {t('popular.views')}
              </label>
              <input
                id="views"
                type="number"
                min={0}
                required
                value={formData.views}
                onChange={(event) =>
                  setFormData({ ...formData, views: Number(event.target.value) })
                }
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="trend" className="text-sm font-medium">
                {t('popular.trend')}
              </label>
              <select
                id="trend"
                value={formData.trend}
                onChange={(event) => setFormData({ ...formData, trend: event.target.value })}
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                <option value="up">{t('popular.trendUp')}</option>
                <option value="flat">{t('popular.trendFlat')}</option>
                <option value="down">{t('popular.trendDown')}</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading
                  ? t('common.saving')
                  : editingId !== null
                    ? t('common.update')
                    : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {initialData.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          {t('popular.empty')}
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium">{t('popular.colTitle')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('popular.views')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('popular.trend')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {initialData.map((post) => (
                <tr
                  key={post.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3 text-sm">{getTitleBySlug(post.slug)}</td>
                  <td className="px-4 py-3 tabular-nums">{(post.views ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <TrendIcon trend={post.trend} />
                      <TrendLabel trend={post.trend} t={t} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(post)}
                        className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={loading}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
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
