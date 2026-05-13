import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { socialLinks } from '@repo/db/schema';
import SocialManager from './social-manager';

export const dynamic = 'force-dynamic';

export default async function SocialLinksPage() {
  const items = await db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));

  return <SocialManager items={items} />;
}
