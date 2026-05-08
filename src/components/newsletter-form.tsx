'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function NewsletterForm({ className }: { className?: string }) {
  const t = useTranslations('common');
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) throw new Error('failed');
        toast.success(t('subscribeSuccess'));
        setEmail('');
      } catch {
        toast.error(t('subscribeError'));
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn('flex flex-col gap-2 sm:flex-row', className)}
    >
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('subscribePlaceholder')}
          className="pl-9"
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t('loading') : t('subscribe')}
      </Button>
    </form>
  );
}
