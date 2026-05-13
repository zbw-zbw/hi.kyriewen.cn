import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // 排除 API / 静态资源 / OG 图 / SEO 文件（sitemap、robots、rss）/ 带扩展名的静态文件
  matcher: [
    '/((?!api|_next|_vercel|og|icon|rss\\.xml|sitemap\\.xml|robots\\.txt|.*\\..*).*)',
  ],
};
