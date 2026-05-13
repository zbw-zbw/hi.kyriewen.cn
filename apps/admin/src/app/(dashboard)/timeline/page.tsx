import { desc } from 'drizzle-orm';
import { db } from '@repo/db';
import { timelineEvents } from '@repo/db/schema';
import TimelineManager from './timeline-manager';

export const dynamic = 'force-dynamic';

export default async function TimelinePage() {
  const items = await db
    .select()
    .from(timelineEvents)
    .orderBy(desc(timelineEvents.date));

  return <TimelineManager items={items} />;
}
