export { auth as middleware } from '@/auth';

export const config = {
  // 保护所有页面，排除登录页、API 路由、静态资源
  matcher: [
    '/((?!login|api/auth|_next|favicon\\.ico|.*\\..*).*)',
  ],
};
