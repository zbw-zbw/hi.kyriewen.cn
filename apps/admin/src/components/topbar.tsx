import Image from 'next/image';
import { auth } from '@/auth';

export async function Topbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-medium text-muted-foreground">
          Content Management
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {session?.user && (
          <div className="flex items-center gap-2">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.login ?? ''}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground">
              {session.user.login ?? session.user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
