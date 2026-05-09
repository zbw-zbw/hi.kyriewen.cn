/**
 * 热门博客榜（静态版本）。
 *
 * 为什么不实时：
 * - Vercel Analytics 当前没有官方 read-only API（2026-05）
 * - Plausible / Umami 等自托管方案需要额外服务
 *
 * 维护节奏：
 * - 每周日晚根据 Vercel Analytics dashboard 数据手动更新一次
 * - 字段含义：slug 必须能在博客 MDX 中找到对应文章；views 是过去 30 天 unique pageviews
 * - 顶层导出 POPULAR_POSTS 已按浏览量倒序
 *
 * 后续扩展：
 * - 可以接 GitHub Actions 定时跑 Plausible/Umami 脚本生成此文件
 * - 也可以接 Vercel Analytics 的 webhook（如果他们后面提供）
 */
export interface PopularPost {
  slug: string;
  /** 过去 30 天 unique pageviews，仅供展示，不参与排序（数组顺序就是排名） */
  views: number;
  /** 标记这一段时间内的趋势：上升/平稳/下降，用于 UI 微观提示 */
  trend?: 'up' | 'flat' | 'down';
}

export const POPULAR_POSTS: PopularPost[] = [
  { slug: 'hello-world', views: 1240, trend: 'up' },
];

/** 取 Top N，过滤掉数据库里不存在的 slug 由调用方处理 */
export function getTopPosts(n = 5): PopularPost[] {
  return POPULAR_POSTS.slice(0, n);
}
