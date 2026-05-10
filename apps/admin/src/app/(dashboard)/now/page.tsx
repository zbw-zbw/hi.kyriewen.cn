import { db } from '@repo/db';
import { nowItems, nowConfig } from '@repo/db/schema';
import { asc } from 'drizzle-orm';
import NowManager from './now-manager';

export default async function NowPage() {
  const items = await db
    .select()
    .from(nowItems)
    .orderBy(asc(nowItems.sortOrder));

  const config = await db.select().from(nowConfig);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Now</h2>
        <p className="text-muted-foreground">
          Update what you&apos;re currently doing.
        </p>
      </div>
      <NowManager
        initialItems={JSON.parse(JSON.stringify(items))}
        initialConfig={JSON.parse(JSON.stringify(config))}
      />
    </div>
  );
}
