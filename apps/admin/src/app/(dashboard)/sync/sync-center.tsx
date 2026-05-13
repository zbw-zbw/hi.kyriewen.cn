'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Github,
  Chrome,
  FolderKanban,
  Mail,
  FileText,
} from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

interface SyncTask {
  id: string;
  name: string;
  description: string;
  path: string;
  schedule: string;
}

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'github-stats': Github,
  'chrome-stats': Chrome,
  'sync-projects': FolderKanban,
  'sync-newsletter': Mail,
  'sync-articles': FileText,
};

const TASKS: SyncTask[] = [
  {
    id: 'github-stats',
    name: 'GitHub Stats',
    description: 'Sync GitHub stars, followers & repo stats',
    path: '/api/cron/github-stats',
    schedule: 'Daily 00:00 UTC',
  },
  {
    id: 'chrome-stats',
    name: 'Chrome Stats',
    description: 'Sync Chrome extension user counts',
    path: '/api/cron/chrome-stats',
    schedule: 'Daily 00:05 UTC',
  },
  {
    id: 'sync-projects',
    name: 'Sync Projects',
    description: 'Sync GitHub repos to projects table',
    path: '/api/cron/sync-projects',
    schedule: 'Daily 00:10 UTC',
  },
  {
    id: 'sync-newsletter',
    name: 'Sync Newsletter',
    description: 'Sync newsletter subscriber count',
    path: '/api/cron/sync-newsletter',
    schedule: 'Daily 00:15 UTC',
  },
  {
    id: 'sync-articles',
    name: 'Sync Articles',
    description: 'Sync articles from Juejin',
    path: '/api/cron/sync-articles',
    schedule: 'Daily 00:20 UTC',
  },
];

type TaskStatus = 'idle' | 'running' | 'success' | 'error';

export function SyncCenter() {
  const { t } = useAdminLocale();
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [taskResults, setTaskResults] = useState<Record<string, string>>({});
  const [runningAll, setRunningAll] = useState(false);

  const triggerTask = useCallback(async (taskId: string) => {
    setTaskStatuses((prev) => ({ ...prev, [taskId]: 'running' }));
    setTaskResults((prev) => ({ ...prev, [taskId]: '' }));

    try {
      const body: Record<string, unknown> = { taskId };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setTaskStatuses((prev) => ({ ...prev, [taskId]: 'success' }));

      // Build friendly result message
      const result = data.result ?? {};
      let friendlyMessage = 'Completed successfully';
      if (taskId === 'sync-articles' && Array.isArray(result.results)) {
        const parts = result.results.map(
          (r: {
            source: string;
            imported: number;
            skipped: number;
            contentFailed?: number;
            error?: string;
          }) => {
            if (r.error) return `${r.source}: error`;
            const label = r.source === 'juejin' ? '掘金' : r.source.toUpperCase();
            let msg = `${label}: +${r.imported} new, ${r.skipped} skipped`;
            if (r.contentFailed && r.contentFailed > 0) {
              msg += ` ⚠️ ${r.contentFailed} content failed`;
            }
            return msg;
          },
        );
        friendlyMessage = parts.join(' · ');
      } else if (typeof result.imported === 'number') {
        friendlyMessage = `+${result.imported} imported, ${result.skipped ?? 0} skipped`;
      } else if (typeof result.updated === 'number') {
        friendlyMessage = `${result.updated} records updated`;
      }

      setTaskResults((prev) => ({ ...prev, [taskId]: friendlyMessage }));
      toast.success(
        `${TASKS.find((task) => task.id === taskId)?.name ?? taskId}: ${friendlyMessage}`,
      );
    } catch (error) {
      setTaskStatuses((prev) => ({ ...prev, [taskId]: 'error' }));
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTaskResults((prev) => ({ ...prev, [taskId]: message }));
      toast.error(`${taskId} failed: ${message}`);
    }
  }, []);

  const triggerAll = useCallback(async () => {
    setRunningAll(true);
    for (const task of TASKS) {
      await triggerTask(task.id);
    }
    setRunningAll(false);
    toast.success(t('sync.toastAllCompleted'));
  }, [triggerTask, t]);

  function getStatusIcon(status: TaskStatus) {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="text-muted-foreground h-5 w-5" />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Run All button */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{TASKS.length} sync tasks configured</p>
        <button
          onClick={triggerAll}
          disabled={runningAll}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {runningAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {runningAll ? t('sync.runningAll') : t('sync.runAll')}
        </button>
      </div>

      {/* Task cards */}
      <div className="grid gap-3">
        {TASKS.map((task) => {
          const status = taskStatuses[task.id] ?? 'idle';
          const result = taskResults[task.id];
          const TaskIcon = TASK_ICONS[task.id] ?? RefreshCw;
          return (
            <div
              key={task.id}
              className="border-border hover:bg-muted/30 rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <TaskIcon className="text-muted-foreground h-5 w-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{task.name}</h3>
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                      {task.schedule}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{task.description}</p>
                  {result && (
                    <p
                      className={`mt-1 truncate text-xs ${status === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
                    >
                      {result}
                    </p>
                  )}
                </div>

                {/* Status + Action */}
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <button
                    onClick={() => triggerTask(task.id)}
                    disabled={status === 'running' || runningAll}
                    className="border-border hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t('sync.run')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
