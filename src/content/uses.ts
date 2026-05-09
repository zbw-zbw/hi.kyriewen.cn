export interface UsesItem {
  name: string;
  url?: string;
  note: { en: string; zh: string };
  /** 5 分制亲身评分（可选，越实诚越好） */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** 一句话推荐心得（<= 30 字），用于 hover/旁注引号气泡 */
  verdict?: { en: string; zh: string };
  /** 用了多久（'YYYY-MM' 起始月）—— 自动算成"X 年/X 月" */
  since?: string;
}

export interface UsesSection {
  id: string;
  title: { en: string; zh: string };
  items: UsesItem[];
}

/** 把 'YYYY-MM' 起始时间换算成"用了 X 年/月"的人话 */
export function formatSince(
  since: string,
  locale: 'en' | 'zh',
  now: Date = new Date()
): string {
  const [yStr, mStr = '01'] = since.split('-');
  const start = new Date(Number(yStr), Number(mStr) - 1, 1);
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 1) return locale === 'zh' ? '刚开始' : 'Just started';
  if (months < 12) {
    return locale === 'zh' ? `${months} 个月` : `${months} mo`;
  }
  const years = Math.floor(months / 12);
  const remain = months % 12;
  if (locale === 'zh') {
    return remain ? `${years} 年 ${remain} 个月` : `${years} 年`;
  }
  return remain ? `${years}y ${remain}mo` : `${years}y`;
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
        rating: 5,
        since: '2024-01',
        verdict: {
          en: 'Best laptop I have ever owned, full stop.',
          zh: '迄今最好用的笔记本，没有之一。',
        },
      },
      {
        name: 'Keychron Q1 Pro',
        note: {
          en: 'Wireless mechanical keyboard with QMK/VIA.',
          zh: '无线机械键盘，支持 QMK/VIA 配置。',
        },
        rating: 4,
        since: '2023-06',
        verdict: {
          en: 'Heavy but rock solid; QMK is a superpower.',
          zh: '稍重但极扎实，QMK 是隐藏外挂。',
        },
      },
      {
        name: 'Dell U2723QE 4K',
        note: {
          en: '27" 4K with USB-C hub.',
          zh: '27 寸 4K，带 USB-C Hub。',
        },
        rating: 4,
        since: '2023-03',
        verdict: {
          en: 'Single-cable workflow is a game changer.',
          zh: '一根线接一切，工作流舒适度满分。',
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
        rating: 5,
        since: '2024-04',
        verdict: {
          en: 'Cmd+K is the most underrated keystroke of 2024.',
          zh: 'Cmd+K 是 2024 年最被低估的快捷键。',
        },
      },
      {
        name: 'Ghostty',
        url: 'https://ghostty.org',
        note: {
          en: 'GPU-accelerated terminal.',
          zh: 'GPU 加速的终端。',
        },
        rating: 4,
        since: '2024-12',
        verdict: {
          en: 'Fast, native, and zero-config — bye iTerm.',
          zh: '极速、原生、零配置，告别 iTerm。',
        },
      },
      {
        name: 'Zsh + Starship',
        note: {
          en: 'Minimal prompt, fast startup.',
          zh: '极简提示符，启动快。',
        },
        rating: 5,
        since: '2022-01',
        verdict: {
          en: 'Sub-100ms startup, never going back.',
          zh: '启动 < 100ms，回不去了。',
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
        rating: 5,
        since: '2020-08',
        verdict: {
          en: 'Refactor confidence > write speed.',
          zh: '重构信心 > 编码速度。',
        },
      },
      {
        name: 'Next.js',
        url: 'https://nextjs.org',
        note: {
          en: 'Current site runs on Next.js 15 App Router.',
          zh: '当前这个站就是 Next.js 15 App Router。',
        },
        rating: 4,
        since: '2022-10',
        verdict: {
          en: 'App Router learning curve hurts; payoff is real.',
          zh: 'App Router 学习曲线陡，但真值。',
        },
      },
      {
        name: 'Tailwind CSS',
        url: 'https://tailwindcss.com',
        note: { en: 'v4 with CSS variables.', zh: 'v4 + CSS 变量。' },
        rating: 5,
        since: '2021-05',
        verdict: {
          en: 'Inline classes feel right after 2 weeks.',
          zh: '两周后你会爱上行内类名。',
        },
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
        note: {
          en: 'Hosting + Postgres + Cron.',
          zh: '托管 + Postgres + 定时。',
        },
        rating: 5,
        since: '2022-03',
        verdict: {
          en: 'Push to deploy still feels magical in 2026.',
          zh: 'Push 即部署，2026 年依然觉得神奇。',
        },
      },
      {
        name: 'Cloudflare',
        url: 'https://cloudflare.com',
        note: { en: 'DNS.', zh: 'DNS 解析。' },
        rating: 5,
        since: '2020-01',
        verdict: {
          en: 'Free tier alone outperforms most paid DNS.',
          zh: '免费额度就吊打很多付费方案。',
        },
      },
      {
        name: 'Resend',
        url: 'https://resend.com',
        note: {
          en: 'Transactional email + Audiences.',
          zh: '事务邮件 + Audiences 名单管理。',
        },
        rating: 4,
        since: '2024-07',
        verdict: {
          en: 'Best DX in transactional email today.',
          zh: '当下事务邮件 DX 最好的一家。',
        },
      },
    ],
  },
];
