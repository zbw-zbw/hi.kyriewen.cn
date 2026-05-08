export interface UsesItem {
  name: string;
  url?: string;
  note: { en: string; zh: string };
}

export interface UsesSection {
  id: string;
  title: { en: string; zh: string };
  items: UsesItem[];
}

export const USES: UsesSection[] = [
  {
    id: 'hardware',
    title: { en: 'Hardware', zh: '硬件' },
    items: [
      {
        name: 'MacBook Pro 14" (M3 Pro)',
        note: {
          en: 'Daily driver — silent, fast, great battery.',
          zh: '每日生产力 —— 静音、快、续航顶。',
        },
      },
      {
        name: 'Keychron Q1 Pro',
        note: {
          en: 'Wireless mechanical keyboard with QMK/VIA.',
          zh: '无线机械键盘，支持 QMK/VIA 配置。',
        },
      },
      {
        name: 'Dell U2723QE 4K',
        note: {
          en: '27" 4K with USB-C hub.',
          zh: '27 寸 4K，带 USB-C Hub。',
        },
      },
    ],
  },
  {
    id: 'editor',
    title: { en: 'Editor & Terminal', zh: '编辑器 & 终端' },
    items: [
      {
        name: 'Cursor',
        url: 'https://cursor.sh',
        note: {
          en: 'Primary editor since 2024.',
          zh: '2024 起的主力编辑器。',
        },
      },
      {
        name: 'Ghostty',
        url: 'https://ghostty.org',
        note: {
          en: 'GPU-accelerated terminal.',
          zh: 'GPU 加速的终端。',
        },
      },
      {
        name: 'Zsh + Starship',
        note: {
          en: 'Minimal prompt, fast startup.',
          zh: '极简提示符，启动快。',
        },
      },
    ],
  },
  {
    id: 'dev-stack',
    title: { en: 'Dev Stack', zh: '开发技术栈' },
    items: [
      {
        name: 'TypeScript',
        note: { en: 'Everywhere.', zh: '所有项目。' },
      },
      {
        name: 'Next.js',
        url: 'https://nextjs.org',
        note: {
          en: 'Current site runs on Next.js 16 App Router.',
          zh: '当前这个站就是 Next.js 16 App Router。',
        },
      },
      {
        name: 'Tailwind CSS',
        url: 'https://tailwindcss.com',
        note: { en: 'v4 with CSS variables.', zh: 'v4 + CSS 变量。' },
      },
    ],
  },
  {
    id: 'services',
    title: { en: 'Services', zh: '服务' },
    items: [
      {
        name: 'Vercel',
        url: 'https://vercel.com',
        note: { en: 'Hosting + Postgres + Cron.', zh: '托管 + Postgres + 定时。' },
      },
      {
        name: 'Cloudflare',
        url: 'https://cloudflare.com',
        note: { en: 'DNS.', zh: 'DNS 解析。' },
      },
      {
        name: 'Buttondown',
        url: 'https://buttondown.email',
        note: {
          en: 'Newsletter — simple and indie-friendly.',
          zh: 'Newsletter —— 简洁、对独立开发者友好。',
        },
      },
    ],
  },
];
