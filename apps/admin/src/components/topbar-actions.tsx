'use client';

import { Sun, Moon, Monitor, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAdminLocale } from '@/components/locale-provider';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const THEME_CYCLE: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

/** 右上角工具栏：主题切换 + 语言切换 */
export function TopbarActions() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useAdminLocale();

  const cycleTheme = () => {
    const currentIdx = THEME_CYCLE.indexOf((theme as 'light' | 'dark' | 'system') ?? 'system');
    const nextIdx = (currentIdx + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIdx] ?? 'system');
  };

  const currentTheme = (theme as keyof typeof THEME_ICONS) ?? 'system';
  const ThemeIcon = THEME_ICONS[currentTheme] ?? Monitor;
  const themeLabel = t(`theme.${currentTheme}`);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={cycleTheme}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
        title={themeLabel}
      >
        <ThemeIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{themeLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{locale === 'zh' ? '中文 → EN' : 'EN → 中文'}</span>
      </button>
    </div>
  );
}
