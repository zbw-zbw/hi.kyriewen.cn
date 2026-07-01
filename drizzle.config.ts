import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// 迁移 / push 优先用非池化直连 URL。
// 池化 URL 走 PgBouncer，对 drizzle-kit push 不友好（不支持 schema 变更）。
const rawUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;

if (!rawUrl) {
  throw new Error(
    'Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL. Add to .env.local or Vercel env.',
  );
}

// 确保 sslmode=verify-full，去掉 pg 驱动不支持的 channel_binding
const url = /[?&]sslmode=/i.test(rawUrl)
  ? rawUrl
  : `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}sslmode=verify-full`;
const finalUrl = url.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');

export default {
  schema: './packages/db/src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: finalUrl },
} satisfies Config;
