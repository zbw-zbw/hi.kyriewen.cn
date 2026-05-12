import { auth } from '@/auth';
import { TopbarActions } from '@/components/topbar-actions';

export async function Topbar() {
  const session = await auth();

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 items-center justify-between border-b px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <h1 className="text-muted-foreground text-sm font-medium">Content Management</h1>
      </div>
      <TopbarActions />
    </header>
  );
}
