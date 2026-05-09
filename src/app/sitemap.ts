import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllPostSlugs } from '@/lib/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

const STATIC_PATHS = [
  '',
  '/projects',
  '/blog',
  '/now',
  '/stats',
  '/timeline',
  '/uses',
  '/photos',
  '/guestbook',
  '/subscribe',
];

function localized(path: string) {
  return routing.locales.map((locale) => {
    const prefix =
      locale === routing.defaultLocale ? '' : `/${locale}`;
    return `${SITE_URL}${prefix}${path}`;
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => {
      const prefix =
        locale === routing.defaultLocale ? '' : `/${locale}`;
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
            ])
          ),
        },
      };
    })
  );

  const postEntries: MetadataRoute.Sitemap = getAllPostSlugs().map(
    ({ locale, slug }) => ({
      url: `${SITE_URL}${locale === routing.defaultLocale ? '' : `/${locale}`}/blog/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })
  );

  void localized;
  return [...staticEntries, ...postEntries];
}
