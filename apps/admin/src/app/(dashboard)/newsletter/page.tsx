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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Newsletter</h2>
        <p className="text-muted-foreground">
          Compose and send newsletters to your subscribers via Resend.
        </p>
      </div>
      <NewsletterManager initialIssues={issues} />
    </div>
  );
}
