export { auth as middleware } from '@/auth';

export const config = {
  /**
   * 保护所有页面与 API。
   *
   * 注意：这里**不能**用 `.*\..*` 这类「含点号即跳过」的排除规则 —— 那会让
   * `DELETE /api/blog/1.` 绕过 middleware，而该请求仍会命中 `[id]` 动态段。
   * 只精确排除框架静态资源、图标与登录/OAuth 入口。
   *
   * 真正的授权判定在 auth.ts 的 `authorized` 回调里；
   * 每个 route handler 另有 `requireAdmin()` 作为第二层防线。
   */
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|icon|login|api/auth).*)',
  ],
};
