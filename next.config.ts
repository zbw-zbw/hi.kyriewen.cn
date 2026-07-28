import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * isomorphic-dompurify 在服务端依赖 jsdom，而 jsdom 会在运行时读自己的
   * default-stylesheet.css 等静态资源。一旦被 webpack 打进 server bundle
   * 就会 ENOENT（博客详情页在服务端 sanitize 正文时即命中）。
   * 标为外部包，让它从 node_modules 原地加载。
   */
  serverExternalPackages: ['isomorphic-dompurify'],
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
      // Cloudflare R2 CDN（用户上传的图片）
      { protocol: 'https', hostname: 'cdn.kyriewen.cn' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
