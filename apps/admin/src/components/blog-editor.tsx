'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Save,
  Send,
  ArrowLeft,
  Languages,
  Loader2,
} from 'lucide-react';
import { TiptapEditor, markdownToHtml, htmlToMarkdown } from './tiptap-editor';
import { MdUpload } from './md-upload';

/* ── Types ───────────────────────────────────────────────────── */
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
  source?: string | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface BlogEditorProps {
  post?: BlogPost;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/* ── Component ───────────────────────────────────────────────── */
export function BlogEditor({ post }: BlogEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(post);

  // Frontmatter state
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [summary, setSummary] = useState(post?.summary ?? '');
  const [tagsInput, setTagsInput] = useState(post?.tags.join(', ') ?? '');
  const [lang, setLang] = useState(post?.lang ?? 'zh');
  const [draft, setDraft] = useState(post?.draft !== 0);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');

  // Editor state — store as HTML for Tiptap
  const [editorHtml, setEditorHtml] = useState(() => {
    const md = post?.content ?? '';
    return md ? markdownToHtml(md) : '';
  });

  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Auto-generate slug from title (only in create mode)
  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!isEditing) {
        setSlug(slugify(value));
      }
    },
    [isEditing],
  );

  // Handle MD file import
  const handleMdImport = useCallback(
    (result: { content: string; frontmatter: { title?: string; summary?: string; tags?: string[]; coverImage?: string; slug?: string } }) => {
      const { content, frontmatter } = result;
      if (frontmatter.title) handleTitleChange(frontmatter.title);
      if (frontmatter.slug) setSlug(frontmatter.slug);
      if (frontmatter.summary) setSummary(frontmatter.summary);
      if (frontmatter.tags) setTagsInput(frontmatter.tags.join(', '));
      if (frontmatter.coverImage) setCoverImage(frontmatter.coverImage);
      // Convert imported markdown to HTML for Tiptap
      setEditorHtml(markdownToHtml(content));
    },
    [handleTitleChange],
  );

  // Build request body (convert HTML back to Markdown for DB)
  async function buildRequestBody(overrideDraft?: number) {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const markdownContent = await htmlToMarkdown(editorHtml);

    return {
      slug: slug.trim(),
      title: title.trim(),
      summary: summary.trim() || null,
      content: markdownContent,
      tags,
      lang,
      draft: overrideDraft ?? (draft ? 1 : 0),
      coverImage: coverImage.trim() || null,
    };
  }

  // Save handler
  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      toast.error('Title and slug are required.');
      return;
    }

    setSaving(true);
    try {
      const body = await buildRequestBody();
      const url = isEditing ? `/api/blog/${post!.id}` : '/api/blog';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Failed to save post');
      }

      toast.success(isEditing ? 'Post updated!' : 'Post created!');
      router.push('/blog');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save post',
      );
    } finally {
      setSaving(false);
    }
  }

  // Publish handler
  async function handlePublish() {
    if (!title.trim() || !slug.trim()) {
      toast.error('Title and slug are required.');
      return;
    }

    setSaving(true);
    try {
      const body = await buildRequestBody(0);
      const url = isEditing ? `/api/blog/${post!.id}` : '/api/blog';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Failed to publish post');
      }

      toast.success('Post published!');
      router.push('/blog');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to publish post',
      );
    } finally {
      setSaving(false);
    }
  }

  // Auto-translate: save current zh post, then create/update en version
  async function handleTranslate() {
    if (lang !== 'zh') {
      toast.error('Auto-translate only works for Chinese articles.');
      return;
    }
    if (!title.trim() || !slug.trim()) {
      toast.error('Please fill in title and slug first.');
      return;
    }

    setTranslating(true);
    try {
      // 1. Translate title, summary, content in batch
      const markdownContent = await htmlToMarkdown(editorHtml);
      const textsToTranslate = [
        { text: title, type: 'title' as const, field: 'title' },
        ...(summary ? [{ text: summary, type: 'description' as const, field: 'summary' }] : []),
        ...(markdownContent ? [{ text: markdownContent, type: 'article' as const, field: 'content' }] : []),
      ];

      const translateRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: textsToTranslate }),
      });

      if (!translateRes.ok) {
        const err = await translateRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Translation failed');
      }

      const { results } = await translateRes.json();
      const translated: Record<string, string> = {};
      for (const r of results) {
        if (r.field) translated[r.field] = r.translated;
      }

      // 2. Create or update English version
      const enBody = {
        slug: slug.trim(),
        title: translated.title ?? title,
        summary: translated.summary ?? summary ?? null,
        content: translated.content ?? markdownContent,
        tags: tagsInput.split(',').map((t: string) => t.trim()).filter(Boolean),
        lang: 'en',
        draft: 1, // Always create as draft for review
        coverImage: coverImage.trim() || null,
      };

      // Try to find existing English version
      const checkRes = await fetch(`/api/blog?lang=en&slug=${encodeURIComponent(slug.trim())}`);
      let method = 'POST';
      let url = '/api/blog';

      if (checkRes.ok) {
        const existing = await checkRes.json();
        const posts = existing.data ?? existing.posts ?? [];
        if (posts.length > 0) {
          method = 'PATCH';
          url = `/api/blog/${posts[0].id}`;
        }
      }

      const saveRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enBody),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save English version');
      }

      toast.success('English version created/updated as draft!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Translation failed',
      );
    } finally {
      setTranslating(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring';

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.push('/blog')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to posts
      </button>

      {/* MD Import */}
      <MdUpload onImport={handleMdImport} />

      {/* Frontmatter form */}
      <div className="rounded-lg border border-border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title"
              className={inputClass}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="post-slug"
              className={inputClass}
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-1 block text-sm font-medium">Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className={inputClass}
            >
              <option value="zh">Chinese (中文)</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Summary */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the post"
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="react, nextjs, typescript"
              className={inputClass}
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Cover Image URL
            </label>
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
          </div>

          {/* Source info (read-only, shown for synced articles) */}
          {post?.source && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Source
              </label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                  {post.source}
                </span>
                {post.sourceUrl && (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View original
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Draft toggle */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="draft-toggle"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="draft-toggle" className="text-sm font-medium">
              Draft (not published)
            </label>
          </div>
        </div>
      </div>

      {/* Tiptap Rich Text Editor */}
      <TiptapEditor
        content={editorHtml}
        onChange={setEditorHtml}
        placeholder="Start writing your post..."
      />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          onClick={handleSave}
          disabled={saving || translating}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving || translating}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {saving ? 'Publishing...' : 'Save & Publish'}
        </button>

        {/* Auto-translate button */}
        <button
          onClick={handleTranslate}
          disabled={saving || translating || lang !== 'zh'}
          title={lang !== 'zh' ? 'Only available for Chinese articles' : 'Translate to English and create draft'}
          className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {translating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {translating ? 'Translating...' : 'Auto Translate → EN'}
        </button>
      </div>
    </div>
  );
}
