'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  tags: string[];
  lang: string;
  draft: number;
  coverImage: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type LangFilter = 'all' | 'en' | 'zh';

interface BlogListProps {
  posts: BlogPost[];
}

export function BlogList({ posts }: BlogListProps) {
  const router = useRouter();
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [deleting, setDeleting] = useState<number | null>(null);

  const filteredPosts =
    langFilter === 'all'
      ? posts
      : posts.filter((post) => post.lang === langFilter);

  const handleDelete = useCallback(
    async (postId: number, postTitle: string) => {
      if (!confirm(`Delete "${postTitle}"? This cannot be undone.`)) return;

      setDeleting(postId);
      try {
        const response = await fetch(`/api/blog/${postId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? 'Failed to delete post');
        }

        toast.success(`Deleted "${postTitle}"`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete post'
        );
      } finally {
        setDeleting(null);
      }
    },
    [router]
  );

  function formatDate(date: Date | string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Language filter */}
        <div className="flex gap-1 rounded-md border border-border p-1">
          {(['all', 'en', 'zh'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setLangFilter(value)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                langFilter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {value === 'all' ? 'All' : value.toUpperCase()}
            </button>
          ))}
        </div>

        {/* New post button */}
        <button
          onClick={() => router.push('/blog/new')}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Lang
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Updated
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No posts found.
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{post.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {post.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {post.draft ? (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Published
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/blog/${post.id}`)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={deleting === post.id}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
