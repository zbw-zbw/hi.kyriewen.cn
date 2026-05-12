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
    description: 'Sync articles from CSDN & Juejin',
    path: '/api/cron/sync-articles',
    schedule: 'Daily 00:20 UTC',
  },
];

type TaskStatus = 'idle' | 'running' | 'success' | 'error';
type ArticleSource = 'csdn' | 'juejin';

/**
 * Generate a browser console script that opens each Juejin article in a new
 * window (same origin, bypasses WAF), waits for the DOM to render, extracts
 * the article HTML, converts it to Markdown, and uploads it to Admin API.
 *
 * Must be run from the browser console while on juejin.cn.
 */
function generateBackfillScript(): string {
  const adminApi = 'https://admin.kyriewen.cn';
  /* ------------------------------------------------------------------ *
   *  The script is intentionally compact because it will be copy-pasted *
   *  into a browser console. Variable names are kept short on purpose.  *
   * ------------------------------------------------------------------ */
  return `(async()=>{
/* ── helpers ── */
const API='${adminApi}';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const strip=h=>h.replace(/<[^>]+>/g,'');
const dec=t=>t.replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/&#(\\d+);/g,(_,d)=>String.fromCharCode(+d)).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
const toMd=html=>{let m=html;m=m.replace(/<pre[^>]*><code[^>]*(?:class="[^"]*language-(\\w+)[^"]*")?[^>]*>([\\s\\S]*?)<\\/code><\\/pre>/gi,(_,l,c)=>'\\n\`\`\`'+(l||'')+'\\n'+dec(c.replace(/<[^>]+>/g,''))+'\\n\`\`\`\\n');m=m.replace(/<h([1-5])[^>]*>([\\s\\S]*?)<\\/h\\1>/gi,(_,n,c)=>'\\n'+'#'.repeat(+n)+' '+strip(c)+'\\n');m=m.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\\/?>/gi,'![$2]($1)');m=m.replace(/<img[^>]*src="([^"]*)"[^>]*\\/?>/gi,'![]($1)');m=m.replace(/<a[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi,(_,h,t)=>{const s=strip(t).trim();return s?'['+s+']('+h+')':'';});m=m.replace(/<strong[^>]*>([\\s\\S]*?)<\\/strong>/gi,'**$1**');m=m.replace(/<em[^>]*>([\\s\\S]*?)<\\/em>/gi,'*$1*');m=m.replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/gi,(_,c)=>'\`'+dec(c)+'\`');m=m.replace(/<li[^>]*>([\\s\\S]*?)<\\/li>/gi,(_,c)=>'- '+strip(c).trim()+'\\n');m=m.replace(/<blockquote[^>]*>([\\s\\S]*?)<\\/blockquote>/gi,(_,c)=>strip(c).trim().split('\\n').map(l=>'> '+l).join('\\n')+'\\n');m=m.replace(/<p[^>]*>([\\s\\S]*?)<\\/p>/gi,(_,c)=>'\\n'+strip(c).trim()+'\\n');m=m.replace(/<br[^>]*\\/?>/gi,'\\n');m=m.replace(/<[^>]+>/g,'');m=dec(m);return m.replace(/\\n{3,}/g,'\\n\\n').trim();};

/* ── open a juejin article in a popup, wait for content, extract HTML ── */
async function extractFromPopup(url){
  const w=window.open(url,'_blank','width=900,height=700');
  if(!w){console.log('  ❌ popup blocked! Allow popups for juejin.cn');return null;}
  /* wait for the article content to render (poll every 500ms, max 20s) */
  for(let t=0;t<40;t++){
    await wait(500);
    try{
      const el=w.document.querySelector('.article-viewer.markdown-body.result');
      if(el&&el.innerHTML.length>100){
        const html=el.innerHTML;
        w.close();
        return html;
      }
    }catch(e){/* cross-origin or not ready yet */}
  }
  w.close();
  return null;
}

/* ── main ── */
if(!location.hostname.includes('juejin.cn')){
  console.error('❌ Please run this script on juejin.cn!');
  return;
}
console.log('📋 Fetching article list from Admin API...');
const listRes=await fetch(API+'/api/blog/backfill?source=juejin');
const{data:articles}=await listRes.json();
console.log('Found '+articles.length+' juejin articles');
let ok=0,fail=0;
for(let i=0;i<articles.length;i++){
  const art=articles[i];
  if(!art.sourceUrl){fail++;continue;}
  console.log('['+(i+1)+'/'+articles.length+'] '+art.title.slice(0,40)+'...');
  try{
    const html=await extractFromPopup(art.sourceUrl);
    if(!html){console.log('  ⚠️ no content');fail++;continue;}
    let body=html;
    body=body.replace(/<style[\\s\\S]*?<\\/style>/gi,'');
    body=body.replace(/<svg[\\s\\S]*?<\\/svg>/gi,'');
    const md=toMd(body.trim());
    if(md.length<50){console.log('  ⚠️ content too short');fail++;continue;}
    const upRes=await fetch(API+'/api/blog/backfill',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:art.id,content:md})});
    if(upRes.ok){console.log('  ✅ updated ('+md.length+' chars)');ok++;}
    else{console.log('  ❌ API error');fail++;}
  }catch(e){console.log('  ❌ '+e.message);fail++;}
  await wait(2000);
}
console.log('\\n🎉 Done! ✅ '+ok+' updated, ❌ '+fail+' failed');
})();`;
}

export function SyncCenter() {
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [taskResults, setTaskResults] = useState<Record<string, string>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [articleSources, setArticleSources] = useState<Set<ArticleSource>>(
    new Set(['csdn', 'juejin']),
  );

  const toggleArticleSource = useCallback((source: ArticleSource) => {
    setArticleSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        if (next.size <= 1) {
          toast.error('At least one source must be selected');
          return prev;
        }
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }, []);

  const triggerTask = useCallback(
    async (taskId: string) => {
      setTaskStatuses((prev) => ({ ...prev, [taskId]: 'running' }));
      setTaskResults((prev) => ({ ...prev, [taskId]: '' }));

      try {
        const body: Record<string, unknown> = { taskId };
        if (taskId === 'sync-articles') {
          body.sources = Array.from(articleSources);
        }

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
        toast.success(`${TASKS.find((t) => t.id === taskId)?.name ?? taskId}: ${friendlyMessage}`);
      } catch (error) {
        setTaskStatuses((prev) => ({ ...prev, [taskId]: 'error' }));
        const message = error instanceof Error ? error.message : 'Unknown error';
        setTaskResults((prev) => ({ ...prev, [taskId]: message }));
        toast.error(`${taskId} failed: ${message}`);
      }
    },
    [articleSources],
  );

  const triggerAll = useCallback(async () => {
    setRunningAll(true);
    for (const task of TASKS) {
      await triggerTask(task.id);
    }
    setRunningAll(false);
    toast.success('All sync tasks completed!');
  }, [triggerTask]);

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
          {runningAll ? 'Running All...' : 'Run All Tasks'}
        </button>
      </div>

      {/* Task cards */}
      <div className="grid gap-3">
        {TASKS.map((task) => {
          const status = taskStatuses[task.id] ?? 'idle';
          const result = taskResults[task.id];
          const TaskIcon = TASK_ICONS[task.id] ?? RefreshCw;
          const isArticleSync = task.id === 'sync-articles';

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
                    Run
                  </button>
                </div>
              </div>

              {/* Article sync: backfill script button */}
              {isArticleSync && (
                <div className="mt-3 ml-14 rounded-md border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-800 dark:bg-blue-950/30">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    💡 掘金有反爬限制，需在掘金网站控制台运行脚本补全正文。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const script = generateBackfillScript();
                      navigator.clipboard.writeText(script);
                      toast.success('已复制！请打开 juejin.cn 任意页面，按 F12 打开控制台粘贴运行');
                    }}
                    className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    📋 复制掘金 Backfill 脚本
                  </button>
                </div>
              )}

              {/* Article source toggles */}
              {isArticleSync && (
                <div className="mt-3 ml-14 flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">Sources:</span>
                  {(['csdn', 'juejin'] as ArticleSource[]).map((source) => (
                    <label
                      key={source}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs"
                    >
                      <span
                        role="checkbox"
                        aria-checked={articleSources.has(source)}
                        tabIndex={0}
                        onClick={() => toggleArticleSource(source)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleArticleSource(source);
                          }
                        }}
                        className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                          articleSources.has(source)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-ring'
                        }`}
                      >
                        {articleSources.has(source) && (
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="font-medium">{source === 'csdn' ? 'CSDN' : '掘金'}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
