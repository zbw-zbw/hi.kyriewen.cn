import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

/**
 * Drizzle 客户端。
 * 在未配置 POSTGRES_URL 的本地环境，调用 DB 操作会抛错；
 * 页面/路由应自行兜底。
 */
export const db = drizzle(sql, { schema });
export { schema };
export * from './schema';
