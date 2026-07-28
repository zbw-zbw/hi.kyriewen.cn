import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 必须校验 isAdmin，而不是仅校验「有会话」：
  // 任意 GitHub 用户都能在主站登录并拿到一个合法 session。
  if (!session?.user?.isAdmin) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <div className="flex flex-1 flex-col pl-60">
        <Topbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
