import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAIN_SITE = process.env.MAIN_SITE_URL ?? 'https://hi.kyriewen.cn';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

interface SyncTask {
  id: string;
  name: string;
  description: string;
  path: string;
  schedule: string;
}

export const SYNC_TASKS: SyncTask[] = [
  { id: 'github-stats', name: 'GitHub Stats', description: 'Sync GitHub stars, followers & repo stats', path: '/api/cron/github-stats', schedule: '0 0 * * *' },
  { id: 'chrome-stats', name: 'Chrome Stats', description: 'Sync Chrome extension user counts', path: '/api/cron/chrome-stats', schedule: '5 0 * * *' },
  { id: 'sync-projects', name: 'Sync Projects', description: 'Sync GitHub repos to projects table', path: '/api/cron/sync-projects', schedule: '10 0 * * *' },
  { id: 'sync-newsletter', name: 'Sync Newsletter', description: 'Sync newsletter subscriber count', path: '/api/cron/sync-newsletter', schedule: '15 0 * * *' },
  { id: 'sync-articles', name: 'Sync Articles', description: 'Sync articles from CSDN & Juejin', path: '/api/cron/sync-articles', schedule: '20 0 * * *' },
];

/**
 * GET /api/sync — list all sync tasks
 */
export async function GET() {
  return NextResponse.json({ data: SYNC_TASKS });
}

/**
 * POST /api/sync — trigger a specific sync task
 * Body: { taskId: string }
 */
export async function POST(req: Request) {
  try {
    const { taskId } = (await req.json()) as { taskId?: string };
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = SYNC_TASKS.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: `Unknown task: ${taskId}` }, { status: 404 });
    }

    const url = `${MAIN_SITE}${task.path}`;
    const headers: Record<string, string> = {};
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Sync failed: HTTP ${response.status}`, details: text },
        { status: 502 },
      );
    }

    const result = await response.json().catch(() => ({}));
    return NextResponse.json({ ok: true, taskId, result });
  } catch (error) {
    console.error('[api/sync] POST failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
