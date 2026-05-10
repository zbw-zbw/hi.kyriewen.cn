'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, Pencil, Trash2, Plus, X } from 'lucide-react';

type PopularPost = {
  id: number;
  slug: string;
  views: number | null;
  trend: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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
      return <Minus className="h-4 w-4 text-muted-foreground" />;
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

  function openCreateForm() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
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
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Post
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId !== null ? 'Edit Post' : 'New Post'}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                required
                value={formData.slug}
                onChange={(event) => setFormData({ ...formData, slug: event.target.value })}
                placeholder="my-blog-post"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId !== null ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {initialData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No popular posts yet. Click &quot;Add Post&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
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
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">{post.slug}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {(post.views ?? 0).toLocaleString()}
                  </td>
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
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={loading}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
