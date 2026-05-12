'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, Pencil, Trash2, Plus, X, RefreshCw } from 'lucide-react';

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

function TrendLabel({ trend }: { trend: string | null }) {
  switch (trend) {
    case 'up':
      return <span className="text-green-500">Up</span>;
    case 'down':
      return <span className="text-red-500">Down</span>;
    default:
      return <span className="text-muted-foreground">Flat</span>;
  }
}

export function PopularManager({ initialData }: { initialData: PopularPost[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPostOption[]>([]);
  const [slugSearch, setSlugSearch] = useState('');
  const [showSlugDropdown, setShowSlugDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载已发布的博客文章列表
  useEffect(() => {
    fetch('/api/blog')
      .then((res) => res.json())
      .then((data) => {
        const posts = Array.isArray(data?.data) ? data.data : [];
        setBlogPosts(
          posts.map((p: { slug: string; title: string; lang: string }) => ({
            slug: p.slug,
            title: p.title,
            lang: p.lang,
          })),
        );
      })
      .catch(() => {});
  }, []);

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

  // 选择文章后自动获取浏览量
  async function selectPost(post: BlogPostOption) {
    setFormData((prev) => ({ ...prev, slug: post.slug }));
    setSlugSearch('');
    setShowSlugDropdown(false);

    // 自动获取浏览量
    try {
      const viewsRes = await fetch(`/api/views?slugs=blog/${post.slug}`);
      if (viewsRes.ok) {
        const viewsData = await viewsRes.json();
        const viewCount = viewsData.views?.[`blog/${post.slug}`];
        if (typeof viewCount === 'number') {
          setFormData((prev) => ({ ...prev, views: viewCount }));
        }
      }
    } catch {
      // 获取浏览量失败时保持手动输入的值
    }
  }

  // 同步所有热门文章的浏览量
  async function syncAllViews() {
    if (initialData.length === 0) return;
    setSyncing(true);
    try {
      const slugs = initialData.map((p) => `blog/${p.slug}`).join(',');
      const viewsRes = await fetch(`/api/views?slugs=${encodeURIComponent(slugs)}`);
      if (!viewsRes.ok) throw new Error('Failed to fetch views');

      const viewsData = await viewsRes.json();
      const viewsMap = viewsData.views ?? {};

      let updatedCount = 0;
      for (const post of initialData) {
        const viewCount = viewsMap[`blog/${post.slug}`];
        if (typeof viewCount === 'number' && viewCount !== (post.views ?? 0)) {
          await fetch(`/api/popular/${post.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ views: viewCount }),
          });
          updatedCount++;
        }
      }

      toast.success(`已同步 ${updatedCount} 篇文章的浏览量`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  }

  // 已添加到热门的 slug 集合
  const existingSlugs = new Set(initialData.map((p) => p.slug));

  // 过滤可选的文章列表
  const filteredBlogPosts = blogPosts.filter((post) => {
    if (existingSlugs.has(post.slug) && editingId === null) return false;
    if (!slugSearch.trim()) return true;
    const query = slugSearch.toLowerCase();
    return post.title.toLowerCase().includes(query) || post.slug.toLowerCase().includes(query);
  });

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
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
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

      toast.success(isEditing ? 'Post updated' : 'Post created');
      closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(postId: number) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/popular/${postId}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Delete failed');
      }

      toast.success('Post deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Popular Posts</h2>
          <p className="text-muted-foreground">Track and manage popular posts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={syncAllViews}
            disabled={syncing || initialData.length === 0}
            className="border-border hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '同步浏览量'}
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Post
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border-border bg-background rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId !== null ? 'Edit Post' : 'New Post'}
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
                选择文章
              </label>
              <input
                id="slug"
                type="text"
                required
                value={formData.slug}
                onChange={(event) => {
                  setFormData({ ...formData, slug: event.target.value });
                  setSlugSearch(event.target.value);
                  setShowSlugDropdown(true);
                }}
                onFocus={() => setShowSlugDropdown(true)}
                placeholder="搜索或输入文章 slug..."
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
              {showSlugDropdown && filteredBlogPosts.length > 0 && (
                <div className="border-border bg-background absolute top-full left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-lg">
                  {filteredBlogPosts.slice(0, 10).map((post) => (
                    <button
                      key={`${post.slug}-${post.lang}`}
                      type="button"
                      onClick={() => selectPost(post)}
                      className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors"
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
                Views
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
                Trend
              </label>
              <select
                id="trend"
                value={formData.trend}
                onChange={(event) => setFormData({ ...formData, trend: event.target.value })}
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                <option value="up">Up</option>
                <option value="flat">Flat</option>
                <option value="down">Down</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId !== null ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {initialData.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          No popular posts yet. Click &quot;Add Post&quot; to create one.
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Views</th>
                <th className="px-4 py-3 text-left font-medium">Trend</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialData.map((post) => (
                <tr
                  key={post.id}
                  className="border-border hover:bg-muted/30 border-b transition-colors last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">{post.slug}</td>
                  <td className="px-4 py-3 tabular-nums">{(post.views ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <TrendIcon trend={post.trend} />
                      <TrendLabel trend={post.trend} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(post)}
                        className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1.5 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={loading}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors"
                        title="Delete"
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
