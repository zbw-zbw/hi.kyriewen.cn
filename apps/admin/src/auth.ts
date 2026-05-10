import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

/**
 * 管理员 GitHub ID 白名单（逗号分隔）。
 * 环境变量示例：ADMIN_GITHUB_IDS=12345678,87654321
 */
const adminIds = new Set(
  (process.env.ADMIN_GITHUB_IDS ?? '').split(',').filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'production'
      ? undefined
      : 'dev-secret-do-not-use-in-prod'),
  trustHost: true,
  session: { strategy: 'jwt' },
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
