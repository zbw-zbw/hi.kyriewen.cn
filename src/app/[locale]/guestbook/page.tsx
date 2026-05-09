import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, guestbookMessages, likes } from '@/lib/db';
import type { GuestbookMessage } from '@/lib/db';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SessionProvider } from '@/components/session-provider';
import { GuestbookAuth } from '@/components/guestbook-auth';
import { MessageThread } from '@/components/message-thread';
import { MessageComposer } from '@/components/message-composer';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guestbook',
};

interface LoadResult {
  messages: GuestbookMessage[];
  likes: { counts: Record<string, number>; mine: string[] };
}

async function loadGuestbook(currentUserId: string | null): Promise<LoadResult> {
  try {
    const rows = await db
      .select()
      .from(guestbookMessages)
      .where(isNull(guestbookMessages.postSlug))
      .orderBy(desc(guestbookMessages.createdAt))
      .limit(200);

    if (rows.length === 0) {
      return { messages: [], likes: { counts: {}, mine: [] } };
    }

    const ids = rows.map((r) => String(r.id));

    // 聚合 likes 数
    const counts: Record<string, number> = {};
    const countRows = await db
      .select({
        targetId: likes.targetId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(and(eq(likes.targetType, 'message'), inArray(likes.targetId, ids)))
      .groupBy(likes.targetId);
    for (const r of countRows) counts[r.targetId] = r.count;

    // 当前用户已点赞列表
    let mine: string[] = [];
    if (currentUserId) {
      const mineRows = await db
        .select({ targetId: likes.targetId })
        .from(likes)
        .where(
          and(
            eq(likes.userId, currentUserId),
            eq(likes.targetType, 'message'),
            inArray(likes.targetId, ids)
          )
        );
      mine = mineRows.map((r) => r.targetId);
    }

    return { messages: rows, likes: { counts, mine } };
  } catch (err) {
    console.error('[guestbook] loadGuestbook failed', err);
    return { messages: [], likes: { counts: {}, mine: [] } };
  }
}

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('guestbook.page');

  const session = await auth().catch(() => null);
  const currentUserId = session?.user?.id ?? null;
  const { messages, likes: likesData } = await loadGuestbook(currentUserId);

  const user = session?.user
    ? {
        name: session.user.name ?? session.user.login ?? 'anonymous',
        image: session.user.image ?? null,
      }
    : null;

  return (
    <SessionProvider session={session}>
      <div className="space-y-10">
        <HeroProse>
          <p>{t('title')}</p>
          <p className="mt-2 text-[length:var(--text-body)] font-normal text-[var(--muted-fg)]">
            {t('subtitle')}
          </p>
        </HeroProse>

        <ScrollReveal>
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <GuestbookAuth locale={locale} user={user} />
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mx-auto max-w-2xl">
            <MessageComposer
              locale={locale}
              user={user}
              postSlug={null}
              parentId={null}
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <MessageThread
            messages={messages}
            postSlug={null}
            locale={locale}
            initialLikes={likesData}
            currentUserId={currentUserId}
          />
        </ScrollReveal>
      </div>
    </SessionProvider>
  );
}
