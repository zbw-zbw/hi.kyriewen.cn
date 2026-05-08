import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Drizzle 客户端（Neon HTTP 模式）。
 *
 * 选型理由：
 * - 走 HTTPS fetch，不走 WebSocket，避开本机代理/TUN 对 wss 的 403 拦截
 * - Serverless / Edge 原生支持，冷启动快
 * - @vercel/postgres 已被 Vercel 官方标记 deprecated，迁移方向就是 Neon 原生 SDK
 *
 * 限制：
 * - HTTP 驱动本身不支持交互式 transaction（当前项目也没用到）
 * - 未配置 POSTGRES_URL 的本地环境会抛错；页面/路由已有 try-catch 兜底
 */

// 尽可能复用连接（在 serverless 冷启动后保持 keep-alive）
neonConfig.fetchConnectionCache = true;

const rawUrl =
  process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? '';

// 空字符串会被 neon() 立刻抛错；这里给一个占位 URL 避免 import 时崩溃，
// 真正的 SQL 调用仍会在运行时失败，被路由层 try-catch 接住。
const sql = neon(rawUrl || 'postgresql://placeholder:placeholder@localhost/placeholder');

export const db = drizzle(sql, { schema });
export { schema };
export * from './schema';
