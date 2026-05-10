'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Save,
  Send,
  ArrowLeft,
  Columns2,
  Maximize,
  Eye,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';

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
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface BlogEditorProps {
  post?: BlogPost;
}

type ViewMode = 'split' | 'editor' | 'preview';

/* ── Helpers ─────────────────────────────────────────────────── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function markdownToHtml(source: string): string {
  let html = source;

  // Code blocks (fenced)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-muted rounded p-3 overflow-x-auto my-2"><code>$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted rounded px-1 py-0.5 text-sm">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-4 mb-1">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-2">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded my-2" />'
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-2">$&</ul>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-border pl-4 italic text-muted-foreground my-2">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-border" />');

  // Paragraphs: wrap remaining lines that are not already wrapped
  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<img')
      ) {
        return trimmed;
      }
      return `<p class="my-2">${trimmed}</p>`;
    })
    .join('\n');

  return html;
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
  const [lang, setLang] = useState(post?.lang ?? 'en');
  const [draft, setDraft] = useState(post?.draft !== 0);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');

  // Editor state
  const [content, setContent] = useState(post?.content ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [saving, setSaving] = useState(false);

  // CodeMirror refs
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Image upload ref
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Auto-generate slug from title (only in create mode)
  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!isEditing) {
        setSlug(slugify(value));
      }
    },
    [isEditing]
  );

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setContent(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        updateListener,
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'monospace', fontSize: '14px' },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
    // Only run once on mount; content changes are handled by CodeMirror itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle image upload and insert markdown at cursor
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prefix', 'blog');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload failed');
        }

        const { url } = await response.json();
        const markdownImage = `![${file.name}](${url})`;

        const view = editorViewRef.current;
        if (view) {
          const cursor = view.state.selection.main.head;
          view.dispatch({
            changes: { from: cursor, insert: markdownImage },
            selection: { anchor: cursor + markdownImage.length },
          });
          view.focus();
        } else {
          // Fallback: append to content
          setContent((prev) => prev + `\n${markdownImage}`);
        }

        toast.success('Image inserted');
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Image upload failed'
        );
      } finally {
        setUploadingImage(false);
        // Reset input so the same file can be selected again
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      }
    },
    []
  );

  // Build request body
  function buildRequestBody(overrideDraft?: number) {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      slug: slug.trim(),
      title: title.trim(),
      summary: summary.trim() || null,
      content,
      tags,
      lang,
      draft: overrideDraft ?? (draft ? 1 : 0),
      coverImage: coverImage.trim() || null,
    };
  }

  // Save handler
  async function handleSave() {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error('Title, slug, and content are required.');
      return;
    }

    setSaving(true);
    try {
      const body = buildRequestBody();
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
        error instanceof Error ? error.message : 'Failed to save post'
      );
    } finally {
      setSaving(false);
    }
  }

  // Publish handler (save with draft=0)
  async function handlePublish() {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error('Title, slug, and content are required.');
      return;
    }

    setSaving(true);
    try {
      const body = buildRequestBody(0);
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
        error instanceof Error ? error.message : 'Failed to publish post'
      );
    } finally {
      setSaving(false);
    }
  }

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

      {/* Frontmatter form */}
      <div className="rounded-lg border border-border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Post title"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="post-slug"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Language */}
          <div>
            <label className="mb-1 block text-sm font-medium">Language</label>
            <select
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
          </div>

          {/* Summary */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Summary</label>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Brief description of the post"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
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
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="react, nextjs, typescript"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
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
              onChange={(event) => setCoverImage(event.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
            />
          </div>

          {/* Draft toggle */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="draft-toggle"
              checked={draft}
              onChange={(event) => setDraft(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="draft-toggle" className="text-sm font-medium">
              Draft (not published)
            </label>
          </div>
        </div>
      </div>

      {/* View mode toolbar */}
      <div className="flex items-center gap-1 rounded-md border border-border p-1">
        <button
          onClick={() => setViewMode('editor')}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition-colors ${
            viewMode === 'editor'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Maximize className="h-3.5 w-3.5" />
          Editor
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Columns2 className="h-3.5 w-3.5" />
          Split
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition-colors ${
            viewMode === 'preview'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Insert Image button */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {uploadingImage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {uploadingImage ? 'Uploading...' : 'Insert Image'}
        </button>

        {/* Hidden file input for image upload */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Editor + Preview area */}
      <div
        className={`grid gap-4 ${
          viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'
        }`}
        style={{ minHeight: '500px' }}
      >
        {/* CodeMirror editor */}
        {viewMode !== 'preview' && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div ref={editorContainerRef} className="h-[500px]" />
          </div>
        )}

        {/* Preview panel */}
        {viewMode !== 'editor' && (
          <div className="overflow-auto rounded-lg border border-border p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(content),
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  Start writing to see preview...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {saving ? 'Publishing...' : 'Save & Publish'}
        </button>
      </div>
    </div>
  );
}
