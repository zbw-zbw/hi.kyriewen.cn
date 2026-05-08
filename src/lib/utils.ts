import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 统一的日期格式化。
 *
 * 服务器运行时时区是 UTC（Vercel Serverless 默认），
 * 不显式指定 timeZone 的话会渲染成 UTC 日期，和用户预期不符。
 *
 * 站点作者在北京，目标读者也大多在东八区，固定用 Asia/Shanghai 展示：
 * - zh 文案：`2026年5月9日`
 * - en 文案：`May 9, 2026`
 *
 * 未来如果要做真·多时区（按访客自动换），应当在客户端用 `Intl.DateTimeFormat`
 * 读取 `Intl.DateTimeFormat().resolvedOptions().timeZone`，这里先保持确定性。
 */
export function formatDate(date: string | Date, locale: 'en' | 'zh' = 'en') {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}
