import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

// drizzle-kit 默认只读 .env；手动按优先级加载 .env.local > .env
// 保证 `pnpm drizzle-kit push` 能直接用本地已配好的 POSTGRES_URL。
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// 迁移 / push 用 **非池化直连 URL**：
//   - pooler 域名强制走 WebSocket（@vercel/postgres 的限制），
//     本机代理/TUN 会拦截 wss 握手返回 403
//   - 非池化 URL 走标准 HTTPS，对代理友好
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

// 显式声明 driver = 'pglite' 并不适用这里；
// drizzle-kit 0.31 在 dialect=postgresql + url 场景下会自动选驱动，
// 安装了 @neondatabase/serverless 之后 push/migrate 也会走 Neon HTTP。
export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
} satisfies Config;
