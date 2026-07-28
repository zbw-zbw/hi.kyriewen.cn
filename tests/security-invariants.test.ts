import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 结构性不变式（tripwire）测试。
 *
 * 这些用例不测运行时行为，而是对源码本身做断言。它们存在的理由很具体：
 * 本次审计发现的最严重问题不是「某个函数写错了」，而是「某一类文件漏了一件事」——
 * 33 个后台路由集体没有鉴权。这类缺失只有结构性检查能拦住。
 *
 * 局限：源码扫描比行为测试脆弱。如果这里的断言因为正常重构而失败，
 * 应当先确认不变式本身是否仍以另一种方式成立，再调整断言。
 */

const REPO_ROOT = join(__dirname, '..');
const ADMIN_API_ROOT = join(REPO_ROOT, 'apps/admin/src/app/api');
const MAIN_CRON_ROOT = join(REPO_ROOT, 'src/app/api/cron');

function collectRouteFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectRouteFiles(full));
    else if (entry.name === 'route.ts') found.push(full);
  }
  return found;
}

const HTTP_HANDLER_RE = /^export async function (GET|POST|PATCH|PUT|DELETE)/gm;

describe('后台 API：每个 handler 都必须自带鉴权', () => {
  const routeFiles = collectRouteFiles(ADMIN_API_ROOT)
    // NextAuth 的 handler 本身就是登录入口，不能要求已登录
    .filter((f) => !f.includes(join('auth', '[...nextauth]')));

  it('能扫到后台路由文件（防止路径写错导致测试空跑）', () => {
    expect(routeFiles.length).toBeGreaterThan(20);
  });

  it.each(routeFiles.map((f) => [relative(REPO_ROOT, f), f] as const))(
    '%s 的每个 handler 都调用了 requireAdmin',
    (_label, file) => {
      const src = readFileSync(file, 'utf8');
      const handlerCount = [...src.matchAll(HTTP_HANDLER_RE)].length;

      expect(handlerCount).toBeGreaterThan(0);
      expect(src).toContain("from '@/lib/guard'");

      // 守卫次数必须与 handler 数量一致，避免只给其中一个加了鉴权
      const guardCount = [...src.matchAll(/await requireAdmin\(\)/g)].length;
      expect(guardCount).toBe(handlerCount);
    },
  );
});

describe('后台 middleware 与认证配置', () => {
  const middleware = readFileSync(join(REPO_ROOT, 'apps/admin/src/middleware.ts'), 'utf8');
  const auth = readFileSync(join(REPO_ROOT, 'apps/admin/src/auth.ts'), 'utf8');

  it('matcher 不能用「含点号即跳过」的排除规则', () => {
    // `.*\..*` 会让 `DELETE /api/blog/1.` 完全绕过 middleware，
    // 而该请求仍会命中 [id] 动态段（Number('1.') === 1）。
    // 只看 matcher 本身，不把解释这个问题的注释算进去。
    const matcherLine = middleware.split('\n').find((line) => line.includes('matcher:'));
    expect(matcherLine).toBeDefined();
    expect(matcherLine).not.toContain('.*\\..*');
  });

  it('auth 配置必须有 authorized 回调', () => {
    // 缺这个回调时 next-auth 会把 authorized 视为恒 true 并直接 NextResponse.next()，
    // 也就是 `export { auth as middleware }` 完全不做鉴权
    expect(auth).toMatch(/authorized\s*\(/);
  });

  it('鉴权判定必须校验 isAdmin，而不是仅校验「有会话」', () => {
    // 主站对任意 GitHub 用户开放登录，仅判断 session 存在等于放行所有人
    expect(auth).toContain('isAdmin === true');

    const layout = readFileSync(
      join(REPO_ROOT, 'apps/admin/src/app/(dashboard)/layout.tsx'),
      'utf8',
    );
    expect(layout).toContain('isAdmin');

    const guard = readFileSync(join(REPO_ROOT, 'apps/admin/src/lib/guard.ts'), 'utf8');
    expect(guard).toContain('isAdmin');
  });

  it('后台 session cookie 必须独立命名', () => {
    // cookie 名同时是 NextAuth JWE 的派生盐，独立命名可在 secret 意外复用时兜底
    expect(auth).toContain('kw-admin.session-token');
  });
});

describe('主站 cron 路由鉴权', () => {
  const cronFiles = collectRouteFiles(MAIN_CRON_ROOT);

  it('能扫到 cron 路由文件', () => {
    expect(cronFiles.length).toBeGreaterThan(3);
  });

  it.each(cronFiles.map((f) => [relative(REPO_ROOT, f), f] as const))(
    '%s 使用共享的 fail-closed 鉴权',
    (_label, file) => {
      const src = readFileSync(file, 'utf8');
      expect(src).toContain('authorizeCron');
      // 旧的 fail-open 写法不能再出现
      expect(src).not.toContain('if (!secret) return true');
    },
  );
});

describe('上传端点白名单', () => {
  const upload = readFileSync(join(REPO_ROOT, 'apps/admin/src/app/api/upload/route.ts'), 'utf8');

  it('不允许上传 SVG', () => {
    // SVG 是可执行文档，从 CDN 直开即存储型 XSS
    expect(upload).not.toContain('image/svg+xml');
  });

  it('prefix 与扩展名都不直接采信用户输入', () => {
    expect(upload).toContain('ALLOWED_PREFIXES');
    expect(upload).not.toContain('generateKey(prefix, file.name)');
  });
});

describe('构建流程不得改动数据库 schema', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };

  it('build 脚本里不能带 db:push', () => {
    // 否则每次部署都会对生产库自动执行 schema 变更，无 review、无回滚点
    expect(pkg.scripts.build).not.toContain('db:push');
  });

  it('db:push 仍作为独立的人工命令保留', () => {
    expect(pkg.scripts['db:push']).toBeTruthy();
  });
});

describe('i18n 文案读取端点', () => {
  const route = readFileSync(join(REPO_ROOT, 'apps/admin/src/app/api/i18n/json/route.ts'), 'utf8');

  it('locale 必须走白名单校验（会拼进文件路径）', () => {
    expect(route).toContain('ALLOWED_LOCALES');
  });
});
