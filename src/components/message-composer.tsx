'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bold, Italic, Code, Link2, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { renderSafeMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

export interface MessageComposerProps {
  locale: 'en' | 'zh';
  /** 博客评论场景：传 slug；留言墙：null */
  postSlug?: string | null;
  /** 楼中楼回复场景：父留言 id */
  parentId?: number | null;
  /** 占位符，覆盖默认文案 */
  placeholder?: string;
  /** 发布成功回调（如关闭回复框） */
  onPosted?: () => void;
  /** 可选取消按钮回调（楼中楼回复时显示） */
  onCancel?: () => void;
  /** 紧凑模式（楼中楼回复用，rows 更少） */
  compact?: boolean;
  /** 未登录时是否显示登录提示（默认 true，外层若已显示则传 false） */
  showAuthPrompt?: boolean;
  /** 已登录用户信息（外层从 session 拿） */
  user?: { name: string; image?: string | null } | null;
  /** 增量刷新回调：若提供则替代 router.refresh()，避免整页刷新 */
  onMutate?: () => void;
}

const MAX_LEN = 1000;

/**
 * 通用留言/评论发布器：
 * - 支持 Markdown 工具栏（粗体/斜体/代码/链接）
 * - 支持实时预览切换
 * - 字数统计
 * - 楼中楼场景（parentId）紧凑显示 + 取消按钮
 */
export function MessageComposer({
  locale,
  postSlug = null,
  parentId = null,
  placeholder,
  onPosted,
  onCancel,
  compact = false,
  showAuthPrompt = true,
  user,
  onMutate,
}: MessageComposerProps) {
  const router = useRouter();
  const t = useTranslations('message');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [pending, startTransition] = useTransition();

  /** 刷新数据：优先用增量回调，否则回退到整页 RSC 刷新 */
  const refreshData = onMutate ?? (() => router.refresh());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: trimmed,
            parentId: parentId ?? undefined,
            postSlug: postSlug ?? undefined,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (data.error === 'rate_limited') {
            toast.error(t('rateLimited'));
          } else {
            throw new Error(data.error ?? 'unknown');
          }
          return;
        }
        toast.success(t('posted'));
        setBody('');
        setPreview(false);
        refreshData();
        onPosted?.();
      } catch {
        toast.error(t('postFailed'));
      }
    });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 工具栏：在 textarea 当前光标/选区位置插入 Markdown 标记
  // 支持"先选中文字，再点工具栏"的交互
  const insertMarkdown = (before: string, after: string = before, sample = '') => {
    const ta = textareaRef.current;
    if (!ta) {
      setBody((b) => `${b}${before}${sample}${after}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || sample;
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  // 未登录态
  if (!user) {
    if (!showAuthPrompt) return null;
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        {locale === 'zh'
          ? '请先用 GitHub 登录后再留言。'
          : 'Sign in with GitHub to leave a message.'}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {/* 工具栏 + 编辑区连体容器（消除 space-y-2 间距） */}
      <div className="overflow-hidden rounded-md border border-[var(--border)]">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => insertMarkdown('**', '**', t('boldSample'))}
              label="Bold (⌘B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown('*', '*', t('italicSample'))}
              label="Italic (⌘I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('`', '`', 'code')} label="Inline code">
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown('[', '](https://)', t('linkSample'))}
              label="Link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--fg)]"
            >
              {preview ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  {t('edit')}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  {t('preview')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 编辑区 / 预览区 */}
        {preview ? (
          <div
            className={cn(
              'min-h-[80px] bg-[var(--card)] p-3 text-sm',
              '[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-fg)] [&_code]:rounded [&_code]:bg-[var(--bg)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p]:my-1',
            )}
            dangerouslySetInnerHTML={{
              __html: body.trim()
                ? renderSafeMarkdown(body)
                : `<p class="text-[var(--muted)]">${t('previewEmpty')}</p>`,
            }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // ⌘B / ⌘I 快捷键
              if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
                if (e.key === 'b') {
                  e.preventDefault();
                  insertMarkdown('**', '**', t('boldSample'));
                } else if (e.key === 'i') {
                  e.preventDefault();
                  insertMarkdown('*', '*', t('italicSample'));
                } else if (e.key === 'Enter' && body.trim()) {
                  // ⌘Enter 提交
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            maxLength={MAX_LEN}
            rows={compact ? 2 : 3}
            placeholder={
              placeholder ??
              (locale === 'zh'
                ? '说点什么吧… 支持 Markdown'
                : 'Say something nice… Markdown supported')
            }
            className="w-full resize-none border-0 bg-[var(--card)] p-3 text-sm outline-none"
            disabled={pending}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--muted)]">
          {body.length}/{MAX_LEN} · {t('mdHint')}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
              <X className="h-3 w-3" />
              {t('cancel')}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? t('posting') : t('post')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--fg)]"
    >
      {children}
    </button>
  );
}
