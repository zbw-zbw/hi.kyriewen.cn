import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  /**
   * 自动检测：
   * 1. 优先读 NEXT_LOCALE cookie（用户手动切换过语言时由 next-intl 自动写入）
   * 2. 否则解析 Accept-Language header，匹配到 zh-* 跳 /zh
   * 3. 都没有则用 defaultLocale (en)
   *
   * 配合 LocaleSwitcher 一起工作：用户切语言 → next-intl 自动写 cookie → 下次访问优先用 cookie
   */
  localeDetection: true,
  localeCookie: {
    // 1 年有效期，覆盖大多数回访场景
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
