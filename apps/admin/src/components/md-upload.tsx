'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Frontmatter {
  title?: string;
  summary?: string;
  tags?: string[];
  coverImage?: string;
  slug?: string;
  date?: string;
}

interface MdUploadResult {
  content: string;
  frontmatter: Frontmatter;
}

interface MdUploadProps {
  onImport: (result: MdUploadResult) => void;
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; content: string } {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = raw.match(fmRegex);

  if (!match) return { frontmatter: {}, content: raw };

  const fmBlock = match[1];
  const content = match[2];
  const fm: Frontmatter = {};

  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    let value = line.slice(colonIdx + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'title':
        fm.title = value;
        break;
      case 'summary':
      case 'description':
      case 'excerpt':
        fm.summary = value;
        break;
      case 'tags':
      case 'categories':
        // Handle YAML array: [tag1, tag2] or - tag1\n- tag2
        if (value.startsWith('[')) {
          fm.tags = value
            .slice(1, -1)
            .split(',')
            .map((t) => t.trim().replace(/['"]/g, ''))
            .filter(Boolean);
        } else if (value) {
          fm.tags = [value];
        }
        break;
      case 'cover':
      case 'coverimage':
      case 'cover_image':
      case 'image':
      case 'thumbnail':
        fm.coverImage = value;
        break;
      case 'slug':
        fm.slug = value;
        break;
      case 'date':
      case 'published':
      case 'publishedat':
        fm.date = value;
        break;
    }
  }

  return { frontmatter: fm, content: content.trim() };
}

export function MdUpload({ onImport }: MdUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(md|mdx|markdown)$/i)) {
        toast.error('Please upload a .md or .mdx file');
        return;
      }

      setLoading(true);
      try {
        const text = await file.text();
        const { frontmatter, content } = parseFrontmatter(text);

        // If no title in frontmatter, use filename
        if (!frontmatter.title) {
          frontmatter.title = file.name.replace(/\.(md|mdx|markdown)$/i, '').replace(/[-_]/g, ' ');
        }

        onImport({ content, frontmatter });
        toast.success(`Imported: ${frontmatter.title}`);
      } catch {
        toast.error('Failed to read file');
      } finally {
        setLoading(false);
      }
    },
    [onImport]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [processFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
        dragging
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : dragging ? (
        <FileText className="h-4 w-4" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      <span>{loading ? 'Importing...' : 'Import from .md / .mdx file'}</span>
      <input ref={inputRef} type="file" accept=".md,.mdx,.markdown" onChange={handleChange} className="hidden" />
    </div>
  );
}
