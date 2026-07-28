import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * next-auth middleware 的行为探针（canary）。
 *
 * 为什么需要它：next-auth v5 至今只有 beta（npm 上 latest 仍是 4.x），
 * 而本次审计发现的最严重漏洞正是 beta 的语义细节 ——
 * 缺少 callbacks.authorized 时 handleAuth 会把 authorized 视为恒 true 并直接
 * NextResponse.next()，于是 `export { auth as middleware }` 完全不做鉴权。
 *
 * security-invariants 里那条「auth.ts 必须含 authorized」是源码字符串扫描：
 * 如果未来 next-auth 改了这个回调的语义，扫描依然通过，而鉴权已经失效 ——
 * 那是虚假的安全感。这里改为真正调用 middleware，断言未认证请求被拒。
 *
 * 环境变量必须在导入 auth.ts 之前设置：adminIds 与 secret 都是模块加载期求值的。
 */

process.env.NEXTAUTH_SECRET = 'test-secret-for-middleware-canary';
process.env.ADMIN_GITHUB_IDS = '12345678';
process.env.NEXTAUTH_URL = 'https://admin.example.test';

const { middleware } = await import('@/middleware');

/** 构造一个不带任何 cookie 的请求 —— 即未认证访问者。 */
function anonymousRequest(path: string): NextRequest {
  // 必须是 NextRequest：next-auth 的 reqWithEnvURL 会读 req.nextUrl
  return new NextRequest(`https://admin.example.test${path}`);
}

async function callMiddleware(path: string): Promise<Response> {
  // middleware 的类型是 next-auth 的多重载签名（兼容 pages/app router 多种用法），
  // 这里只用其中的 middleware 用法，故经 unknown 转一次。
  // 第二个参数是 NextFetchEvent，鉴权路径上不会用到。
  const asMiddleware = middleware as unknown as (req: NextRequest) => Promise<Response>;
  return asMiddleware(anonymousRequest(path));
}

describe('未认证请求必须被 middleware 拦下', () => {
  it('后台 API 返回 401，而不是放行', async () => {
    const response = await callMiddleware('/api/seed');

    // 这条断言是整个探针的核心：
    // 若 next-auth 未来恢复「无 authorized 即放行」的行为，这里会变成 200
    expect(response.status).toBe(401);
  });

  it('401 响应体是 JSON，而不是 HTML 登录页', async () => {
    // 后台前端用 fetch 调这些接口，返回 HTML 会导致 res.json() 抛错、
    // 真实的鉴权失败被伪装成解析错误
    const response = await callMiddleware('/api/blog');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('含点号的动态段路径同样被拦下', async () => {
    // matcher 若用 `.*\..*` 排除静态资源，此路径会完全绕过 middleware，
    // 而 Next 仍会把它路由到 [id]（Number('1.') === 1）
    const response = await callMiddleware('/api/blog/1.');

    expect(response.status).toBe(401);
  });

  it('页面请求重定向到登录页，而不是返回 401', async () => {
    const response = await callMiddleware('/projects');

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get('location')).toContain('/login');
  });
});
