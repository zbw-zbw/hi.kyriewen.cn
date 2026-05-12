'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Save, Send, ArrowLeft, Languages, Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [showPreview, setShowPreview] = useState(true);

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
    (result: {
      content: string;
      frontmatter: {
        title?: string;
        summary?: string;
        tags?: string[];
        coverImage?: string;
        slug?: string;
      };
    }) => {
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
      toast.error(error instanceof Error ? error.message : 'Failed to save post');
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

      // Auto-translate if Chinese article — fire-and-forget, don't block navigation
      if (lang === 'zh') {
        toast.info('后台正在自动翻译英文版…');
        autoTranslateToEnglish(true).catch(() => {
          toast.error('自动翻译失败，可稍后手动翻译');
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish post');
    } finally {
      setSaving(false);
    }
  }

  /**
   * 翻译中文文章为英文并保存。
   * @param autoPublish 为 true 时英文版直接发布（draft=0），否则保存为草稿
   */
  async function autoTranslateToEnglish(autoPublish = false) {
    const markdownContent = await htmlToMarkdown(editorHtml);
    const textsToTranslate = [
      { text: title, type: 'title' as const, field: 'title' },
      ...(summary ? [{ text: summary, type: 'description' as const, field: 'summary' }] : []),
      ...(markdownContent
        ? [{ text: markdownContent, type: 'article' as const, field: 'content' }]
        : []),
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

    const enBody = {
      slug: slug.trim(),
      title: translated.title ?? title,
      summary: translated.summary ?? summary ?? null,
      content: translated.content ?? markdownContent,
      tags: tagsInput
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean),
      lang: 'en',
      draft: autoPublish ? 0 : 1,
      coverImage: coverImage.trim() || null,
    };

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

    toast.success(autoPublish ? '英文版已自动翻译并发布 ✅' : '已自动创建英文版草稿');
  }

  // Manual translate button handler — reuses autoTranslateToEnglish
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
      await autoTranslateToEnglish();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Sticky header ─────────────────────────────── */}
      <div className="border-border shrink-0 space-y-4 border-b pb-4">
        {/* Back + MD Import */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/blog')}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to posts
          </button>
          <MdUpload onImport={handleMdImport} />
        </div>

        {/* Frontmatter form */}
        <div className="border-border rounded-lg border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <label className="mb-1 block text-sm font-medium">Language</label>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className={inputClass}>
                <option value="zh">Chinese (中文)</option>
                <option value="en">English</option>
              </select>
            </div>
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
            <div>
              <label className="mb-1 block text-sm font-medium">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="react, nextjs, typescript"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cover Image URL</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={inputClass}
              />
            </div>
            {post?.source && (
              <div className="sm:col-span-2">
                <label className="text-muted-foreground mb-1 block text-sm font-medium">
                  Source
                </label>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
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
            <div className="flex items-center gap-2 sm:col-span-2">
              <span
                role="checkbox"
                aria-checked={draft}
                tabIndex={0}
                onClick={() => setDraft((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setDraft((v) => !v);
                  }
                }}
                className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  draft
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-ring'
                }`}
              >
                {draft && (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <label
                className="cursor-pointer text-sm font-medium"
                onClick={() => setDraft((v) => !v)}
              >
                Draft (not published)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable editor area ────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto py-4">
        {/* Editor + Preview toggle */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Content</h3>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="border-border hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {/* Editor + Live Preview (side by side) */}
        <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Left: Tiptap WYSIWYG Editor (editable) */}
          <div className="min-w-0">
            <TiptapEditor
              content={editorHtml}
              onChange={setEditorHtml}
              placeholder="Start writing your post..."
            />
          </div>

          {/* Right: Rendered preview (read-only) */}
          {showPreview && (
            <div className="border-border bg-muted/30 min-w-0 overflow-auto rounded-lg border p-4">
              <div className="border-border mb-2 flex items-center gap-2 border-b pb-2">
                <Eye className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-xs font-medium">Preview</span>
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-w-none wrap-break-word"
                dangerouslySetInnerHTML={{
                  __html:
                    editorHtml ||
                    '<p class="text-muted-foreground">Preview will appear here...</p>',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer (action buttons) ────────────── */}
      <div className="border-border shrink-0 border-t pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || translating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handlePublish}
            disabled={saving || translating}
            className="border-border bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
          <button
            onClick={handleTranslate}
            disabled={saving || translating || lang !== 'zh'}
            title={
              lang !== 'zh'
                ? 'Only available for Chinese articles'
                : 'Translate to English and create draft'
            }
            className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
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
    </div>
  );
}
