import { db } from '@repo/db';
import { newsletterIssues } from '@repo/db/schema';
import { desc } from 'drizzle-orm';
import NewsletterManager from './newsletter-manager';

export default async function NewsletterPage() {
  let issues: Array<Record<string, unknown>> = [];
  try {
    const rows = await db
      .select()
      .from(newsletterIssues)
      .orderBy(desc(newsletterIssues.sentAt));
    issues = JSON.parse(JSON.stringify(rows));
  } catch {
    // table may not exist yet
  }

  return <NewsletterManager initialIssues={issues} />;
}
