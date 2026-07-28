import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * 后台 API 统一鉴权守卫。
 *
 * 为什么每个 route handler 都要显式调用，而不是只依赖 middleware：
 * 1. middleware 的 matcher 必须排除静态资源，任何基于 `.` 的排除规则都会漏掉
 *    形如 `/api/blog/1.` 的请求 —— 它仍会命中 `[id]` 动态段（`Number('1.') === 1`），
 *    从而在 middleware 完全不执行的情况下删掉真实数据。
 * 2. 授权是数据边界的职责。middleware 是路由层的优化手段，不是唯一防线。
 *
 * @returns 未授权时返回可直接 `return` 的响应；已授权返回 null。
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth().catch(() => null);

  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (session.user.isAdmin !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}
