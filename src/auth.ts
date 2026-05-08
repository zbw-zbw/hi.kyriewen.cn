import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  // 本地没配 NEXTAUTH_SECRET 时给一个 dev fallback，避免启动时崩
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
      }
      return session;
    },
  },
});

declare module 'next-auth' {
  interface User {
    login?: string;
  }
  interface Session {
    user: {
      id: string;
      login?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
