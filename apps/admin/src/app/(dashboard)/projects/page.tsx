import { asc } from 'drizzle-orm';
import { db } from '@repo/db';
import { projects } from '@repo/db/schema';
import ProjectsManager from './projects-manager';

export const dynamic = 'force-dynamic';

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function ProjectsPage() {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder));

  /* Parse JSON text columns into real objects for the client component */
  const items = rows.map((row) => ({
    ...row,
    stack: safeJsonParse<string[]>(row.stack, []),
    gallery: safeJsonParse<string[] | null>(row.gallery, null),
    metrics: safeJsonParse<{ users?: number; stars?: number; rating?: number } | null>(row.metrics, null),
    changelog: safeJsonParse<unknown[] | null>(row.changelog, null),
  }));

  return <ProjectsManager items={items} />;
}
