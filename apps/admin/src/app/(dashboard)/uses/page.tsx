import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { usesSections, usesItems } from '@repo/db/schema';
import UsesManager from './uses-manager';

export const dynamic = 'force-dynamic';

export default async function UsesPage() {
  const sections = await db
    .select()
    .from(usesSections)
    .orderBy(asc(usesSections.sortOrder));

  const items = await db
    .select()
    .from(usesItems)
    .orderBy(asc(usesItems.sectionId), asc(usesItems.sortOrder));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Uses</h2>
        <p className="text-muted-foreground">
          Manage your hardware, software, and tools.
        </p>
      </div>
      <UsesManager sections={sections} items={items} />
    </div>
  );
}
