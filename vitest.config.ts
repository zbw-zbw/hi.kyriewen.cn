import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * 两个应用的 `@` 别名指向不同目录，因此拆成两个 project。
 * - web:   主站，@ → ./src
 * - admin: 后台，@ → ./apps/admin/src
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: { '@': resolve(__dirname, './src') },
        },
        test: {
          name: 'web',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: { '@': resolve(__dirname, './apps/admin/src') },
        },
        test: {
          name: 'admin',
          environment: 'node',
          include: ['apps/admin/tests/**/*.test.ts'],
          /**
           * next-auth 的 ESM 产物内部导入 `next/server` 这类裸标识符。
           * 默认被外部化后交由 Node 解析，而 Node 不会走 Next 的 exports map，
           * 会报 Cannot find module 'next/server'。内联后由 vite 解析即可。
           */
          server: {
            deps: {
              inline: ['next-auth', '@auth/core'],
            },
          },
        },
      },
    ],
  },
});
