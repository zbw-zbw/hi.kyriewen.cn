import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { LoginContent } from './login-content';

export default async function LoginPage() {
  const session = await auth();

  // 已以管理员身份登录才跳转 Dashboard；
  // 非管理员会话留在登录页，否则会与 layout 的 redirect 形成无限跳转。
  if (session?.user?.isAdmin) {
    redirect('/');
  }

  async function handleSignIn() {
    'use server';
    await signIn('github', { redirectTo: '/' });
  }

  return <LoginContent signInAction={handleSignIn} />;
}
