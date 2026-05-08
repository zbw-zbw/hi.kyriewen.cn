export interface TimelineEvent {
  date: string; // ISO date
  title: { en: string; zh: string };
  description?: { en: string; zh: string };
  type: 'product' | 'post' | 'milestone' | 'career';
  url?: string;
}

export const TIMELINE: TimelineEvent[] = [
  {
    date: '2026-05-08',
    type: 'milestone',
    title: {
      en: 'Launched hi.kyriewen.cn',
      zh: '上线个人站 hi.kyriewen.cn',
    },
    description: {
      en: 'A home for my products, writing and build-in-public data.',
      zh: '承载产品矩阵、博客写作和 Build in Public 数据看板。',
    },
  },
  {
    date: '2025-11-01',
    type: 'product',
    title: {
      en: 'Launched DevToolbox Pro',
      zh: '发布 DevToolbox Pro',
    },
    description: {
      en: 'AI-powered version of Dev Toolbox with regex explainer and JSON diff.',
      zh: '在 Dev Toolbox 基础上加入 AI 能力：正则解释、JSON diff。',
    },
  },
  {
    date: '2025-06-15',
    type: 'product',
    title: {
      en: 'Launched Auto Play Video',
      zh: '发布 Auto Play Video',
    },
  },
  {
    date: '2024-09-01',
    type: 'product',
    title: {
      en: 'Launched Dev Toolbox',
      zh: '发布 Dev Toolbox',
    },
  },
  {
    date: '2024-06-10',
    type: 'product',
    title: {
      en: 'Launched News Aggregator',
      zh: '发布 News Aggregator',
    },
  },
  {
    date: '2024-04-02',
    type: 'product',
    title: {
      en: 'Launched QR Code Generator',
      zh: '发布 QR Code Generator',
    },
  },
  {
    date: '2024-02-14',
    type: 'product',
    title: {
      en: 'Launched Image Harvest',
      zh: '发布 Image Harvest',
    },
  },
  {
    date: '2023-01-01',
    type: 'milestone',
    title: {
      en: 'Started writing in public',
      zh: '开始公开写作',
    },
  },
];

export function getTimelineByYear(locale: 'en' | 'zh') {
  void locale;
  const grouped = new Map<number, TimelineEvent[]>();
  for (const event of TIMELINE) {
    const year = new Date(event.date).getFullYear();
    const list = grouped.get(year) ?? [];
    list.push(event);
    grouped.set(year, list);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, events]) => ({
      year,
      events: events.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
}
