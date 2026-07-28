import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { NextResponse } from 'next/server';

/**
 * 管理员 GitHub ID 白名单（逗号分隔）。
 * 环境变量示例：ADMIN_GITHUB_IDS=12345678,87654321
 *
 * 未配置时集合为空 —— 任何人都无法登录（fail-closed）。
 */
const adminIds = new Set((process.env.ADMIN_GITHUB_IDS ?? '').split(',').filter(Boolean));

if (adminIds.size === 0) {
  console.warn('[auth] ADMIN_GITHUB_IDS 未配置，所有登录都会被拒绝');
}

/**
 * Session secret。
 *
 * 必须与主站使用**不同**的值：NextAuth 的 JWE 密钥由 HKDF(secret, salt=cookieName)
 * 派生，一旦 secret 与 cookie 名都相同，主站签发的会话可以直接平移到后台使用，
 * 而主站对任意 GitHub 用户开放登录。
 *
 * 生产环境缺失时不在此处 throw：`next build` 也跑在 NODE_ENV=production 下，
 * 招错会直接打断构建。交由 NextAuth 在请求期 fail-closed（MissingSecret → 500）。
 */
const configuredSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!configuredSecret && process.env.NODE_ENV === 'production') {
  console.error('[auth] 生产环境缺少 NEXTAUTH_SECRET / AUTH_SECRET，所有认证请求都将失败');
}

const secret =
  configuredSecret ??
  (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-do-not-use-in-prod');

// cookie 名同时作为 JWE 的派生盐，独立命名可在 secret 意外复用时提供第二层隔离
const useSecureCookies = process.env.NODE_ENV === 'production';
const sessionCookieName = `${useSecureCookies ? '__Secure-' : ''}kw-admin.session-token`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as {
          id?: number | string;
          login?: string;
          avatar_url?: string;
        };
        if (p.id !== undefined) token.ghId = String(p.id);
        if (p.login) token.ghLogin = p.login;
        if (p.avatar_url) token.ghAvatar = p.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.ghId ?? token.sub ?? '');
        if (typeof token.ghLogin === 'string') {
          session.user.login = token.ghLogin;
        }
        if (typeof token.ghAvatar === 'string') {
          session.user.image = token.ghAvatar;
        }
        // 标记是否为管理员
        session.user.isAdmin = adminIds.has(session.user.id);
      }
      return session;
    },
    async signIn({ profile }) {
      // 仅允许白名单中的 GitHub 用户登录
      const ghId = String((profile as { id?: number | string })?.id ?? '');
      if (!adminIds.has(ghId)) {
        return false; // 拒绝非管理员
      }
      return true;
    },
    /**
     * middleware 的实际拦截逻辑。
     *
     * 缺少这个回调时 next-auth 会把 `authorized` 视为恒 true 并直接 NextResponse.next()，
     * 也就是 `export { auth as middleware }` 完全不做任何鉴权。
     *
     * 注意：next-auth v5 至今只有 beta（npm 上 latest 仍是 4.x），上述语义属于
     * 未冻结的实现细节。apps/admin/tests/middleware-canary.test.ts 会真实调用
     * middleware 并断言未认证请求被拒；升级后若该探针变红，
     * 说明鉴权已失效——不要删探针。
     */
    authorized({ request, auth: session }) {
      if (session?.user?.isAdmin === true) return true;

      // API 请求返回 401 JSON，避免把 HTML 登录页回给 fetch 调用方
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }

      // 页面请求交给 NextAuth 重定向到 pages.signIn
      return false;
    },
  },
});

/** 检查 GitHub ID 是否为管理员 */
export function isAdmin(ghId: string): boolean {
  return adminIds.has(ghId);
}

declare module 'next-auth' {
  interface User {
    login?: string;
    isAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      login?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}
