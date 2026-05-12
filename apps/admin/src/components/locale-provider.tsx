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
    'common.addNew': '+ 新增',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.saving': '保存中…',
    'common.create': '创建',
    'common.update': '更新',
    // Page titles
    'page.projects.title': '项目',
    'page.projects.desc': '管理你的项目展示。',
    'page.navigation.title': '导航',
    'page.navigation.desc': '管理站点导航菜单。',
    'page.timeline.title': '时间线',
    'page.timeline.desc': '管理时间线事件。',
    'page.now.title': '动态',
    'page.now.desc': '管理"现在"页面条目。',
    'page.blog.title': '博客',
    'page.blog.desc': '管理博客文章。',
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
    'common.addNew': '+ Add New',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.saving': 'Saving…',
    'common.create': 'Create',
    'common.update': 'Update',
    // Page titles
    'page.projects.title': 'Projects',
    'page.projects.desc': 'Manage your project showcase.',
    'page.navigation.title': 'Navigation',
    'page.navigation.desc': 'Manage your site navigation menu items.',
    'page.timeline.title': 'Timeline',
    'page.timeline.desc': 'Manage timeline events.',
    'page.now.title': 'Now',
    'page.now.desc': 'Manage your "Now" page items.',
    'page.blog.title': 'Blog',
    'page.blog.desc': 'Manage blog posts.',
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
