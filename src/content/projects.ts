export type ProjectCategory = 'chrome-extension' | 'web-app' | 'library';

export interface ProjectI18nField {
  en: string;
  zh: string;
}

export interface Project {
  slug: string;
  name: string;
  category: ProjectCategory;
  tagline: ProjectI18nField;
  description: ProjectI18nField;
  stack: string[];
  repo?: string;
  live?: string;
  chromeStoreId?: string; // Chrome Web Store 扩展 ID，用于抓取用户数
  featured: boolean;
  pinned: boolean;
  year: number;
  accent?: string; // 卡片强调色（可选）
}

export const PROJECTS: Project[] = [
  {
    slug: 'image-harvest',
    name: 'Image Harvest',
    category: 'chrome-extension',
    tagline: {
      en: 'One-click image collector for any web page',
      zh: '一键抓取任意网页的图片资源',
    },
    description: {
      en: 'A Chrome extension that scans the current tab, previews all images and lets you batch download them — entirely local, no tracking.',
      zh: '扫描当前页面所有图片，支持预览、筛选与批量下载。纯本地运行，零追踪。',
    },
    stack: ['TypeScript', 'Chrome MV3', 'Vite', 'React'],
    repo: 'https://github.com/zbw-zbw/image-harvest',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    category: 'chrome-extension',
    tagline: {
      en: 'Generate stylish QR codes offline',
      zh: '离线生成好看的二维码',
    },
    description: {
      en: 'Generate customizable QR codes from any URL, text or Wi-Fi credentials. Works offline, with logo embedding and batch export.',
      zh: '支持 URL、文本、Wi-Fi 等多种类型，离线可用，支持 Logo 嵌入与批量导出。',
    },
    stack: ['TypeScript', 'Chrome MV3', 'Canvas API'],
    repo: 'https://github.com/zbw-zbw/qr-code-generator',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'news-aggregator',
    name: 'News Aggregator',
    category: 'chrome-extension',
    tagline: {
      en: 'Your personal news dashboard',
      zh: '你的个人新闻仪表盘',
    },
    description: {
      en: 'Aggregate news feeds from multiple sources into a clean, customizable new-tab dashboard.',
      zh: '将多个来源的新闻聚合到简洁的新标签页面板，支持自定义订阅与分类。',
    },
    stack: ['TypeScript', 'Chrome MV3', 'React', 'RSS'],
    repo: 'https://github.com/zbw-zbw/news-aggregator',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'dev-toolbox',
    name: 'Dev Toolbox',
    category: 'chrome-extension',
    tagline: {
      en: 'Swiss-army knife for developers',
      zh: '开发者的瑞士军刀',
    },
    description: {
      en: 'JSON formatter, Base64 / URL codec, regex tester, UUID generator, timestamp converter — all in one popup.',
      zh: 'JSON 格式化、Base64/URL 编解码、正则测试、UUID、时间戳转换，一个弹窗全搞定。',
    },
    stack: ['TypeScript', 'Chrome MV3', 'React'],
    repo: 'https://github.com/zbw-zbw/dev-toolbox',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'devtoolbox-pro',
    name: 'DevToolbox Pro',
    category: 'chrome-extension',
    tagline: {
      en: 'AI-powered dev utilities',
      zh: 'AI 加持的开发者工具集',
    },
    description: {
      en: 'The pro version with AI-powered regex explanation, JSON diff, code beautify and structured-data inspection.',
      zh: '在 Dev Toolbox 基础上加入 AI：正则解释、JSON diff、代码美化、结构化数据检查。',
    },
    stack: ['TypeScript', 'Chrome MV3', 'React', 'OpenAI API'],
    repo: 'https://github.com/zbw-zbw/devtoolbox-pro',
    featured: true,
    pinned: false,
    year: 2025,
  },
  {
    slug: 'auto-play-video',
    name: 'Auto Play Video',
    category: 'chrome-extension',
    tagline: {
      en: 'Never click play again',
      zh: '告别手动点击播放',
    },
    description: {
      en: 'Automatically starts playback on popular video sites and skips intro / ads when possible.',
      zh: '在常见视频站点自动开始播放，并在可能时跳过片头/广告。',
    },
    stack: ['TypeScript', 'Chrome MV3'],
    repo: 'https://github.com/zbw-zbw/auto-play-video',
    featured: false,
    pinned: false,
    year: 2025,
  },
];

export function getFeaturedProjects() {
  return PROJECTS.filter((p) => p.featured);
}

export function getPinnedProjects() {
  return PROJECTS.filter((p) => p.pinned);
}

export function getProjectBySlug(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}
