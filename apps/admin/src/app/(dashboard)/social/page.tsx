import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { socialLinks } from '@repo/db/schema';
import SocialManager from './social-manager';

export const dynamic = 'force-dynamic';

export default async function SocialLinksPage() {
  const items = await db
    .select()
    .from(socialLinks)
    .orderBy(asc(socialLinks.sortOrder));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Social Links</h2>
        <p className="text-muted-foreground">
          Manage your social media links.
        </p>
      </div>
      <SocialManager items={items} />
    </div>
  );
}
