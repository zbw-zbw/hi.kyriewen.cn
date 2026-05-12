import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
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
