import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, guestbookMessages } from '@/lib/db';
import type { GuestbookMessage } from '@/lib/db';
import { SessionProvider } from '@/components/session-provider';
import { GuestbookAuth } from '@/components/guestbook-auth';
import { GuestbookForm } from '@/components/guestbook-form';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guestbook',
};

async function loadMessages(): Promise<GuestbookMessage[]> {
  try {
    return await db
      .select()
      .from(guestbookMessages)
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(100);
  } catch {
    return [];
  }
}

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth().catch(() => null);
  const messages = await loadMessages();

  const user = session?.user
    ? {
        name: session.user.name ?? session.user.login ?? 'anonymous',
        image: session.user.image ?? null,
      }
    : null;

  return (
    <SessionProvider session={session}>
      <div className="space-y-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {locale === 'zh' ? '留言墙' : 'Guestbook'}
          </h1>
          <p className="text-[var(--muted-fg)]">
            {locale === 'zh'
              ? '用 GitHub 登录后即可留言。打个招呼、吐个槽，或者告诉我你最喜欢哪个产品。'
              : 'Sign in with GitHub and leave a note. Say hi, rant, or tell me your favorite product.'}
          </p>
        </section>

        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <GuestbookAuth locale={locale} user={user} />
        </div>

        <GuestbookForm locale={locale} user={user} />

        <ul className="space-y-5">
          {messages.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">
              {locale === 'zh'
                ? '还没有留言，来做第一个吧。'
                : 'No messages yet — be the first to sign.'}
            </li>
          ) : (
            messages.map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
              >
                {m.avatar && (
                  <Image
                    src={m.avatar}
                    alt={m.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 flex-shrink-0 rounded-full"
                    unoptimized
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{m.name}</span>
                    <time
                      className="font-mono text-xs text-[var(--muted)]"
                      dateTime={m.createdAt.toISOString()}
                    >
                      {formatDate(m.createdAt, locale)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.body}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </SessionProvider>
  );
}
