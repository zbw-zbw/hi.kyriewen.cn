'use client';

import { Palette } from 'lucide-react';
import {
  useAccent,
  ACCENTS,
  type Accent,
} from '@/components/theme-accent-provider';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';

const ACCENT_LABELS: Record<Accent, string> = {
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  orange: 'Orange',
};

const ACCENT_COLORS: Record<Accent, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
};

/**
 * 主题色切换器 — 下拉面板形式。
 * 默认向右下角展开；如果右侧空间不足自动切换到左侧。
 */
export function AccentSwitcher() {
  const { accent, setAccent } = useAccent();
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 计算展开方向：检测按钮右侧是否有足够空间放下面板
  const updateAlignment = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = 180;
    // 右侧剩余空间不足时，右对齐（right-0）；否则默认右对齐
    const rightSpace = window.innerWidth - rect.right;
    setAlignRight(rightSpace < panelWidth);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = useCallback(() => {
    updateAlignment();
    setOpen((prev) => !prev);
  }, [updateAlignment]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Switch accent color"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)]"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 shadow-[var(--shadow-elevated)]',
            alignRight ? 'right-0' : 'left-0'
          )}
        >
          <div className="flex items-center gap-2">
            {ACCENTS.map((accentOption) => (
              <button
                key={accentOption}
                type="button"
                onClick={() => {
                  setAccent(accentOption);
                  setOpen(false);
                }}
                title={ACCENT_LABELS[accentOption]}
                className={cn(
                  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 transition-all',
                  accent === accentOption
                    ? 'scale-110 border-[var(--fg)]'
                    : 'border-transparent hover:scale-105'
                )}
              >
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: ACCENT_COLORS[accentOption] }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
