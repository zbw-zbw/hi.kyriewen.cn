import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Last.fm 专辑封面（Fastly CDN）
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      // Last.fm 偶尔也会回退到 img2-ak CDN
      { protocol: 'https', hostname: 'lastfm-img2.akamaized.net' },
      // GitHub 头像 / opengraph 图
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
      // Unsplash 占位图（/photos 照片墙 — 后续替换为本地资源）
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
