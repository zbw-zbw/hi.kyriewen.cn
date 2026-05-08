'use client';

import Image from 'next/image';
import { signIn, signOut } from 'next-auth/react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  locale: 'en' | 'zh';
  user: { name: string; image?: string | null } | null;
}

export function GuestbookAuth({ locale, user }: Props) {
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => signIn('github')}>
        <Github className="h-4 w-4" />
        {locale === 'zh' ? '用 GitHub 登录' : 'Sign in with GitHub'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {user.image && (
        <Image
          src={user.image}
          alt={user.name}
          width={28}
          height={28}
          className="h-7 w-7 rounded-full"
          unoptimized
        />
      )}
      <span className="text-[var(--muted-fg)]">{user.name}</span>
      <button
        onClick={() => signOut()}
        className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
      >
        {locale === 'zh' ? '退出' : 'Sign out'}
      </button>
    </div>
  );
}
