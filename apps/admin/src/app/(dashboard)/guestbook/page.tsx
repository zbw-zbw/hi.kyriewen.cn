import { db } from '@repo/db';
import { guestbookMessages } from '@repo/db/schema';
import { desc, sql } from 'drizzle-orm';
import GuestbookManager from './guestbook-manager';

export default async function GuestbookPage() {
  const messages = await db
    .select()
    .from(guestbookMessages)
    .orderBy(desc(guestbookMessages.createdAt))
    .limit(50);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guestbookMessages);
  const total = countResult[0]?.count ?? 0;

  return (
    <GuestbookManager
      initialMessages={JSON.parse(JSON.stringify(messages))}
      initialTotal={total}
    />
  );
}
