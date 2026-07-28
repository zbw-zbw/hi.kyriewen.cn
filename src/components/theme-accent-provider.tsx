'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useClientValue } from '@/lib/use-client-state';

export const ACCENTS = ['blue', 'green', 'purple', 'orange'] as const;
export type Accent = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: Accent = 'blue';
export const ACCENT_STORAGE_KEY = 'kw-accent';

interface AccentContextValue {
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

/** 从 localStorage / data-attr 读出当前 accent。纯读取，仅客户端可调用。 */
function readAccentFromEnvironment(): Accent {
  const fromStorage = (() => {
    try {
      return localStorage.getItem(ACCENT_STORAGE_KEY);
    } catch {
      return null;
    }
  })();
  if (fromStorage && (ACCENTS as readonly string[]).includes(fromStorage)) {
    return fromStorage as Accent;
  }

  const fromAttr = document.documentElement.getAttribute('data-accent');
  if (fromAttr && (ACCENTS as readonly string[]).includes(fromAttr)) {
    return fromAttr as Accent;
  }

  return DEFAULT_ACCENT;
}

/**
 * Accent 主题色 Provider：
 * - 通过 <html data-accent="..."> 切换全站强调色
 * - localStorage 持久化（防闪烁脚本在 layout 里同步注入）
 * - 由于切换写的是 documentElement，不需要 hydration mismatch 处理
 */
export function ThemeAccentProvider({ children }: { children: React.ReactNode }) {
  // 环境里的初始值：SSR 为 default，hydration 后变为真实值。
  // 用双快照而不是在 effect 里 setState，避免级联渲染。
  const initialAccent = useClientValue(readAccentFromEnvironment, DEFAULT_ACCENT);
  // 用户主动切换后的覆盖值；null 表示“仍用环境值”
  const [override, setOverride] = useState<Accent | null>(null);
  const accent = override ?? initialAccent;

  // 把最终值写回 DOM（防闪烁脚本可能已经先一步设好，这里只负责对齐）
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  const setAccent = useCallback((a: Accent) => {
    setOverride(a);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, a);
    } catch {
      /* quota or privacy mode */
    }
    document.documentElement.setAttribute('data-accent', a);
  }, []);

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>;
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
