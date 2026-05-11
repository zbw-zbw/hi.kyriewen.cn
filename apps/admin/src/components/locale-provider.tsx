'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Locale = 'en' | 'zh';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
});

/* ── Admin UI translations ───────────────────────────────────── */
const messages: Record<Locale, Record<string, string>> = {
  zh: {
    // Sidebar groups
    'nav.overview': '概览',
    'nav.content': '内容管理',
    'nav.engagement': '互动',
    'nav.settings': '设置',
    'nav.system': '系统',
    // Sidebar items
    'nav.dashboard': '仪表盘',
    'nav.blog': '博客',
    'nav.projects': '项目',
    'nav.now': '动态',
    'nav.photos': '照片',
    'nav.timeline': '时间线',
    'nav.uses': '装备',
    'nav.newsletter': '通讯',
    'nav.guestbook': '留言板',
    'nav.social': '社交链接',
    'nav.popular': '热门文章',
    'nav.navigation': '导航',
    'nav.i18n': 'i18n 文案',
    'nav.sync': '同步中心',
    'nav.seed': '初始数据',
    'nav.signout': '退出登录',
    // Theme
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',
    // Common
    'common.language': '语言',
  },
  en: {
    'nav.overview': 'Overview',
    'nav.content': 'Content',
    'nav.engagement': 'Engagement',
    'nav.settings': 'Settings',
    'nav.system': 'System',
    'nav.dashboard': 'Dashboard',
    'nav.blog': 'Blog',
    'nav.projects': 'Projects',
    'nav.now': 'Now',
    'nav.photos': 'Photos',
    'nav.timeline': 'Timeline',
    'nav.uses': 'Uses',
    'nav.newsletter': 'Newsletter',
    'nav.guestbook': 'Guestbook',
    'nav.social': 'Social Links',
    'nav.popular': 'Popular Posts',
    'nav.navigation': 'Navigation',
    'nav.i18n': 'i18n Messages',
    'nav.sync': 'Sync Center',
    'nav.seed': 'Seed Data',
    'nav.signout': 'Sign Out',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'common.language': 'Language',
  },
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('admin-locale') as Locale | null;
    if (saved === 'en' || saved === 'zh') setLocaleState(saved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem('admin-locale', next);
  }, []);

  const t = useCallback(
    (key: string) => messages[locale]?.[key] ?? messages.en[key] ?? key,
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useAdminLocale() {
  return useContext(LocaleContext);
}
