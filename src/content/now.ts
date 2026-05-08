export interface NowItem {
  label: { en: string; zh: string };
  value: { en: string; zh: string };
}

export const NOW_UPDATED_AT = '2026-05-08';

export const NOW_CURRENTLY_BUILDING: { en: string; zh: string } = {
  en: 'DevToolbox Pro — AI-powered dev utilities',
  zh: 'DevToolbox Pro —— AI 加持的开发者工具集',
};

export const NOW_ITEMS: NowItem[] = [
  {
    label: { en: 'Building', zh: '正在打造' },
    value: {
      en: 'DevToolbox Pro — regex explainer, JSON diff, AI code review.',
      zh: 'DevToolbox Pro —— 正则解释、JSON diff、AI 代码审查。',
    },
  },
  {
    label: { en: 'Learning', zh: '正在学习' },
    value: {
      en: 'Rust for scripting and Astro for my next side project.',
      zh: 'Rust 脚本开发，以及用 Astro 做下一个副业项目。',
    },
  },
  {
    label: { en: 'Reading', zh: '正在阅读' },
    value: {
      en: '"Working in Public" by Nadia Eghbal.',
      zh: '《Working in Public》— Nadia Eghbal',
    },
  },
  {
    label: { en: 'Listening', zh: '正在听' },
    value: {
      en: 'Lo-fi beats while coding; podcasts on indie hacking.',
      zh: 'Lo-fi beats 编码背景音；独立开发者相关播客。',
    },
  },
];
