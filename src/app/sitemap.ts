import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllPostSlugs } from '@/lib/blog';
import { getNavigationItems } from '@/lib/content-loader';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

function localized(path: string) {
  return routing.locales.map((locale) => {
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
    return `${SITE_URL}${prefix}${path}`;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 从数据库/fallback 动态获取导航项生成静态路径
  const navItems = await getNavigationItems();
  const staticPaths = navItems
    .filter((item) => item.visible)
    .map((item) => (item.href === '/' ? '' : item.href));

  const staticEntries: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    routing.locales.map((locale) => {
      const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
      return {
        url: `${SITE_URL}${prefix}${path}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: path === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [
              l,
              `${SITE_URL}${l === routing.defaultLocale ? '' : `/${l}`}${path}`,
            ]),
          ),
        },
      };
    }),
  );

  const slugs = await getAllPostSlugs();
  const postEntries: MetadataRoute.Sitemap = slugs.map(({ locale, slug }) => ({
    url: `${SITE_URL}${locale === routing.defaultLocale ? '' : `/${locale}`}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  void localized;
  return [...staticEntries, ...postEntries];
}
