import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { LoginContent } from './login-content';

export default async function LoginPage() {
  const session = await auth();

  // 已登录则跳转到 Dashboard
  if (session?.user) {
    redirect('/');
  }

  async function handleSignIn() {
    'use server';
    await signIn('github', { redirectTo: '/' });
  }

  return <LoginContent signInAction={handleSignIn} />;
}
