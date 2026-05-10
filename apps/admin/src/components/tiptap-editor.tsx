'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { useCallback, useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  ImagePlus,
  LinkIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const lowlight = createLowlight(common);

/* ── Types ─────────────────────────────────────────────────── */
interface TiptapEditorProps {
  content: string; // HTML content
  onChange: (html: string) => void;
  placeholder?: string;
}

/* ── Toolbar Button ────────────────────────────────────────── */
function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-6 w-px bg-border" />;
}

/* ── Component ─────────────────────────────────────────────── */
export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
}: TiptapEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[400px] px-4 py-3 outline-none focus:outline-none',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files.length) return false;
        const file = event.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) {
          event.preventDefault();
          handleImageFile(file);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleImageFile(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prefix', 'blog');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        toast.success('Image inserted');
      } catch {
        toast.error('Image upload failed');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) handleImageFile(file);
      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    [handleImageFile]
  );

  const insertLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={insertLink} active={editor.isActive('link')} title="Insert Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => imageInputRef.current?.click()} disabled={uploading} title="Insert Image">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Insert Table">
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {/* Bubble Menu (inline formatting on selection) */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ── HTML ↔ Markdown conversion utilities ──────────────────── */

/**
 * Convert Markdown to HTML for loading into Tiptap.
 * Using a simple regex-based converter. For production,
 * consider using `marked` or similar library.
 */
export function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="language-${lang || 'plaintext'}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>(?:\n|$))+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs
  html = html
    .split('\n\n')
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|img|table)/.test(t)) return t;
      return `<p>${t}</p>`;
    })
    .join('');

  return html;
}

/**
 * Convert Tiptap HTML output back to Markdown for DB storage.
 * Uses TurndownService for reliable HTML→MD conversion.
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  const TurndownService = (await import('turndown')).default;
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Custom rule for code blocks with language
  td.addRule('codeBlock', {
    filter: (node) => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild?.nodeName === 'CODE'
      );
    },
    replacement: (_content, node) => {
      const codeEl = (node as HTMLElement).querySelector('code');
      const lang =
        codeEl
          ?.getAttribute('class')
          ?.match(/language-(\w+)/)?.[1] ?? '';
      const code = codeEl?.textContent ?? '';
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },
  });

  return td.turndown(html).trim();
}
