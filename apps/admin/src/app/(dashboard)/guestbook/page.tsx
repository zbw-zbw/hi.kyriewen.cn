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
    <div className="flex h-full flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Guestbook</h2>
        <p className="text-muted-foreground">Manage guestbook messages and blog comments.</p>
      </div>
      <GuestbookManager
        initialMessages={JSON.parse(JSON.stringify(messages))}
        initialTotal={total}
      />
    </div>
  );
}
