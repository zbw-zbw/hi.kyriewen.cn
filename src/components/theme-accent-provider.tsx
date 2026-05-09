'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export const ACCENTS = ['blue', 'green', 'purple', 'orange'] as const;
export type Accent = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: Accent = 'blue';
export const ACCENT_STORAGE_KEY = 'kw-accent';

interface AccentContextValue {
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

/**
 * Accent 主题色 Provider：
 * - 通过 <html data-accent="..."> 切换全站强调色
 * - localStorage 持久化（防闪烁脚本在 layout 里同步注入）
 * - 由于切换写的是 documentElement，不需要 hydration mismatch 处理
 */
export function ThemeAccentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始值从 localStorage / data-attr 读，SSR 时是 default
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT);

  // 挂载后从 DOM 同步（防闪烁脚本可能先一步设置好了）
  useEffect(() => {
    const html = document.documentElement;
    const fromAttr = html.getAttribute('data-accent') as Accent | null;
    const fromStorage = (() => {
      try {
        return localStorage.getItem(ACCENT_STORAGE_KEY) as Accent | null;
      } catch {
        return null;
      }
    })();
    const initial =
      (fromStorage && (ACCENTS as readonly string[]).includes(fromStorage)
        ? fromStorage
        : null) ??
      (fromAttr && (ACCENTS as readonly string[]).includes(fromAttr)
        ? fromAttr
        : null) ??
      DEFAULT_ACCENT;
    setAccentState(initial);
    html.setAttribute('data-accent', initial);
  }, []);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, a);
    } catch {
      /* quota or privacy mode */
    }
    document.documentElement.setAttribute('data-accent', a);
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    // 退化：未挂在 Provider 下时，直接读写 DOM，避免页面崩溃
    return {
      accent: DEFAULT_ACCENT,
      setAccent: (a: Accent) => {
        try {
          localStorage.setItem(ACCENT_STORAGE_KEY, a);
        } catch {
          /* noop */
        }
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-accent', a);
        }
      },
    };
  }
  return ctx;
}

/**
 * 防闪烁脚本：在 React hydration 前同步设置 data-accent。
 * 用在 layout.tsx 的 <head> 里，必须 inline 且 beforeInteractive。
 */
export function ThemeAccentScript() {
  const code = `
(function(){
  try {
    var saved = localStorage.getItem('${ACCENT_STORAGE_KEY}');
    var valid = ['${ACCENTS.join("','")}'];
    var v = (saved && valid.indexOf(saved) >= 0) ? saved : '${DEFAULT_ACCENT}';
    document.documentElement.setAttribute('data-accent', v);
  } catch (e) {
    document.documentElement.setAttribute('data-accent', '${DEFAULT_ACCENT}');
  }
})();
`.trim();
  return (
    <script
      // 必须 dangerouslySetInnerHTML 才能在 hydration 前执行
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
