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

const SYNC_TASKS: SyncTask[] = [
  {
    id: 'github-stats',
    name: 'GitHub Stats',
    description: 'Sync GitHub stars, followers & repo stats',
    path: '/api/cron/github-stats',
    schedule: '0 0 * * *',
  },
  {
    id: 'chrome-stats',
    name: 'Chrome Stats',
    description: 'Sync Chrome extension user counts',
    path: '/api/cron/chrome-stats',
    schedule: '5 0 * * *',
  },
  {
    id: 'sync-projects',
    name: 'Sync Projects',
    description: 'Sync GitHub repos to projects table',
    path: '/api/cron/sync-projects',
    schedule: '10 0 * * *',
  },
  {
    id: 'sync-newsletter',
    name: 'Sync Newsletter',
    description: 'Sync newsletter subscriber count',
    path: '/api/cron/sync-newsletter',
    schedule: '15 0 * * *',
  },
  {
    id: 'sync-articles',
    name: 'Sync Articles',
    description: 'Sync articles from CSDN & Juejin',
    path: '/api/cron/sync-articles',
    schedule: '20 0 * * *',
  },
];

/**
 * GET /api/sync — list all sync tasks
 */
export async function GET() {
  return NextResponse.json({ data: SYNC_TASKS });
}

/**
 * POST /api/sync — trigger a specific sync task
 * Body: { taskId: string, sources?: string[] }
 */
export async function POST(req: Request) {
  try {
    const { taskId, sources } = (await req.json()) as { taskId?: string; sources?: string[] };
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = SYNC_TASKS.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: `Unknown task: ${taskId}` }, { status: 404 });
    }

    if (!CRON_SECRET) {
      return NextResponse.json(
        {
          error:
            'CRON_SECRET not configured. Add it to Admin project env vars in Vercel Dashboard.',
        },
        { status: 500 },
      );
    }

    // Build URL with optional sources query param for sync-articles
    const targetUrl = new URL(`${MAIN_SITE}${task.path}`);
    if (taskId === 'sync-articles' && sources && sources.length > 0) {
      targetUrl.searchParams.set('sources', sources.join(','));
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const hint =
        response.status === 401
          ? ' — Check that CRON_SECRET matches between main site and admin.'
          : '';
      return NextResponse.json(
        { error: `Sync failed: HTTP ${response.status}${hint}`, details: text },
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
