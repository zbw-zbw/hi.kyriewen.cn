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
  /**
   * Chrome Web Store 扩展 ID（32 位小写字母）。
   * 用于 /api/cron/chrome-stats 抓取用户数与评分。
   *
   * 如何获取：访问扩展在 Chrome Web Store 的详情页，URL 形如
   *   https://chromewebstore.google.com/detail/xxx/<extensionId>
   * 把最后那段 32 位 ID 粘到这里。
   * 未上架或未填时会跳过抓取，/stats 页面对应卡片显示 "—"。
   */
  chromeStoreId?: string;
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
    live: 'https://image-harvest.kyriewen.cn',
    chromeStoreId: 'iecgnjidmogebokcfnejncgnelcepffo',
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
    chromeStoreId: 'jklnokpkcmlbchlhegebjbhdhdamnmpg',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'news-aggregator',
    name: 'Geek News Aggregator',
    category: 'web-app',
    tagline: {
      en: 'Daily-updated news for dev & AI communities',
      zh: '每日更新的开发者与 AI 资讯聚合',
    },
    description: {
      en: 'Aggregates RSS feeds, YouTube channels and arXiv papers into 6 specialized categories (AI / Frontend / Backend / Cloud Native / Blockchain / Others) with hot-score ranking.',
      zh: '聚合 RSS、YouTube、arXiv 三类数据源，自动归类 AI / 前端 / 后端 / 云原生 / 区块链 / 其他 六大板块，按热度与时间衰减排序。',
    },
    stack: ['Vue 3', 'Vite', 'Flask', 'SQLAlchemy', 'SQLite', 'Tailwind'],
    repo: 'https://github.com/zbw-zbw/news-aggregator',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'dev-toolbox',
    name: 'Dev Toolbox',
    category: 'web-app',
    tagline: {
      en: 'Your coding partner to improve your efficiency',
      zh: '提升开发效率的一站式工具箱',
    },
    description: {
      en: 'A Next.js web suite bundling JSON formatter, Base64 / URL codecs, regex tester, UUID generator and timestamp converter. Zero-install, works in any browser.',
      zh: '基于 Next.js 的在线工具集：JSON 格式化、Base64/URL 编解码、正则测试、UUID、时间戳转换，打开即用，无需安装。',
    },
    stack: ['Next.js', 'TypeScript', 'React', 'Tailwind'],
    repo: 'https://github.com/zbw-zbw/dev-toolbox',
    featured: true,
    pinned: true,
    year: 2024,
  },
  {
    slug: 'devtoolbox-pro',
    name: 'DevToolbox Pro',
    category: 'web-app',
    tagline: {
      en: 'AI-powered dev utilities, now with Gemini',
      zh: 'Gemini 加持的开发者工具集',
    },
    description: {
      en: 'The premium suite with Gemini-powered code assistance, JSON tools and time conversion. Built in Google AI Studio.',
      zh: '高级版工具集，接入 Gemini 模型，提供 AI 代码辅助、JSON 工具与时间转换，基于 Google AI Studio 搭建。',
    },
    stack: ['React', 'TypeScript', 'Vite', 'Gemini API'],
    repo: 'https://github.com/zbw-zbw/DevToolbox-Pro',
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
    stack: ['JavaScript', 'Chrome MV3', 'Side Panel API'],
    repo: 'https://github.com/zbw-zbw/auto-play-video',
    // chromeStoreId 暂缺：该扩展目前仅通过开发者模式加载，尚未上架 Chrome Web Store。
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
