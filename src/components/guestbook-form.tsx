'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface GuestbookFormProps {
  locale: 'en' | 'zh';
  user: { name: string; image?: string | null } | null;
  onPosted?: () => void;
}

export function GuestbookForm({ locale, user, onPosted }: GuestbookFormProps) {
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (data.error === 'rate_limited') {
            toast.error(
              locale === 'zh'
                ? '太快啦，请稍后再试。'
                : 'Whoa, slow down — try again in a minute.'
            );
          } else {
            throw new Error(data.error ?? 'unknown');
          }
          return;
        }
        toast.success(locale === 'zh' ? '已发布 🎉' : 'Posted 🎉');
        setBody('');
        onPosted?.();
      } catch {
        toast.error(locale === 'zh' ? '发布失败。' : 'Failed to post.');
      }
    });
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        {locale === 'zh'
          ? '请先用 GitHub 登录后再留言。'
          : 'Sign in with GitHub to leave a message.'}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder={
          locale === 'zh' ? '说点什么吧…' : 'Say something nice…'
        }
        className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--card)] p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        disabled={pending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">
          {body.length}/500
        </span>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending
            ? locale === 'zh'
              ? '发布中…'
              : 'Posting…'
            : locale === 'zh'
              ? '发布'
              : 'Post'}
        </Button>
      </div>
    </form>
  );
}
