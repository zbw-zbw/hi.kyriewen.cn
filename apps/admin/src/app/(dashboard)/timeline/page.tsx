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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Timeline</h2>
        <p className="text-muted-foreground">
          Add milestones and events.
        </p>
      </div>
      <TimelineManager items={items} />
    </div>
  );
}
