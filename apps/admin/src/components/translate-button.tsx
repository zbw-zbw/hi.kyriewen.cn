'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslateFieldType } from '@/lib/translate';

interface TranslateButtonProps {
  /** The Chinese text to translate */
  text: string;
  /** The type of text (affects translation prompt) */
  type?: TranslateFieldType;
  /** Callback when translation is complete */
  onTranslated: (translated: string) => void;
  /** Optional label override */
  label?: string;
  /** Optional className */
  className?: string;
}

export function TranslateButton({
  text,
  type = 'description',
  onTranslated,
  label = '→ EN',
  className = '',
}: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!text.trim()) {
      toast.error('No text to translate');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [{ text, type }] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Translation failed');
      }
      const { results } = await res.json();
      if (results?.[0]?.translated) {
        onTranslated(results[0].translated);
        toast.success('Translated!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !text.trim()}
      title="Auto-translate Chinese → English"
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Languages className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
