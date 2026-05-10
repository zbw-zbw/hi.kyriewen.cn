import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// 迁移 / push 优先用 **非池化直连 URL**（走标准 TCP/SSL，对代理友好）
// 池化 URL 走 wss，本机代理/TUN 会拦截 wss 握手返回 403
const rawUrl =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;

if (!rawUrl) {
  throw new Error(
    'Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL. Add to .env.local or Vercel env.'
  );
}

// Neon 必须带 sslmode=require
const url = /[?&]sslmode=/i.test(rawUrl)
  ? rawUrl
  : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}sslmode=require`;

export default {
  schema: './packages/db/src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // 显式指定 driver 为未定义 → 让 drizzle-kit 使用 pg (node-postgres)
  // 而不是自动检测到 @vercel/postgres 后强制走 wss
  driver: undefined,
  dbCredentials: { url },
} satisfies Config;
