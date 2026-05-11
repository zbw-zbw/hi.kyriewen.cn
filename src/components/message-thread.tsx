'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Heart,
  Reply,
  Pencil,
  Trash2,
  X,
  Check,
  Bold,
  Italic,
  Code,
  Link2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatDate } from '@/lib/utils';
import { renderSafeMarkdown } from '@/lib/markdown';
import type { GuestbookMessage } from '@/lib/db';
import { MessageComposer } from '@/components/message-composer';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

export interface MessageThreadProps {
  /** 服务端预取的全部留言（含子回复，平铺一维） */
  messages: GuestbookMessage[];
  /** 博客评论场景传 slug；留言墙留 null */
  postSlug?: string | null;
  locale: 'en' | 'zh';
  /** 服务端预取的点赞数据（避免首屏二次请求） */
  initialLikes?: { counts: Record<string, number>; mine: string[] };
  /** 用户已登录则传 user.id；未登录传 null（影响 编辑/删除/点赞 按钮显示） */
  currentUserId?: string | null;
}

/**
 * 通用留言列表 — 同时服务 /guestbook 和 /blog/[slug] 评论。
 *
 * 设计：
 * - 服务端把 messages 一维平铺传进来，组件内按 parentId 分组成 2 层
 * - 楼中楼最多 2 层（顶层 + 1 级回复），3 级回复会平铺到 1 级
 * - likes 用乐观更新，失败回滚 + toast
 * - Markdown 服务端渲染（用 useMemo 缓存）
 */
export function MessageThread({
  messages,
  postSlug = null,
  locale,
  initialLikes,
  currentUserId = null,
}: MessageThreadProps) {
  const t = useTranslations('message');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const replyUser = session?.user
    ? { name: session.user.name ?? 'anonymous', image: session.user.image ?? null }
    : null;

  // likes 客户端状态（基于 initialLikes 初始化，乐观更新）
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(initialLikes?.counts ?? {});
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set(initialLikes?.mine ?? []));

  // 当前正在回复的 messageId（null = 没在回复任何条）
  const [replyTo, setReplyTo] = useState<number | null>(null);
  // 当前正在编辑的 messageId
  const [editingId, setEditingId] = useState<number | null>(null);

  // 按 parentId 分组：顶层留言 + 每个顶层下的子留言
  const { topLevel, childrenMap } = useMemo(() => {
    const top: GuestbookMessage[] = [];
    const map = new Map<number, GuestbookMessage[]>();
    for (const m of messages) {
      if (m.parentId == null) {
        top.push(m);
      } else {
        // 找到根（如果父也是子，平铺到根 parent 下）
        const rootId = findRootParent(m, messages);
        if (!map.has(rootId)) map.set(rootId, []);
        map.get(rootId)!.push(m);
      }
    }
    // 子留言按时间正序（顶层倒序）
    for (const arr of map.values()) {
      arr.sort((a, b) => +a.createdAt - +b.createdAt);
    }
    return { topLevel: top, childrenMap: map };
  }, [messages]);

  // 客户端 hydration 后再补查一次 likes（防止 SSG/缓存导致 initialLikes 缺失）
  useEffect(() => {
    if (initialLikes) return;
    if (messages.length === 0) return;
    const ids = messages.map((m) => String(m.id)).join(',');
    fetch(`/api/likes?targetType=message&targetIds=${ids}`)
      .then((r) => r.json())
      .then((data: { counts?: Record<string, number>; mine?: string[] }) => {
        if (data.counts) setLikeCounts(data.counts);
        if (data.mine) setLikedSet(new Set(data.mine));
      })
      .catch(() => {});
  }, [messages, initialLikes]);

  if (messages.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{postSlug ? t('emptyPost') : t('empty')}</p>;
  }

  return (
    <ul className="space-y-5">
      {topLevel.map((m) => (
        <li key={m.id}>
          <MessageItem
            message={m}
            locale={locale}
            currentUserId={currentUserId}
            isLiked={likedSet.has(String(m.id))}
            likeCount={likeCounts[String(m.id)] ?? 0}
            onLikeChange={(liked, count) => {
              setLikedSet((s) => {
                const next = new Set(s);
                if (liked) next.add(String(m.id));
                else next.delete(String(m.id));
                return next;
              });
              setLikeCounts((c) => ({ ...c, [String(m.id)]: count }));
            }}
            isEditing={editingId === m.id}
            onStartEdit={() => setEditingId(m.id)}
            onCancelEdit={() => setEditingId(null)}
            onReplyToggle={() => setReplyTo((cur) => (cur === m.id ? null : m.id))}
            t={t}
            tCommon={tCommon}
          />

          {/* 子回复 */}
          {(childrenMap.get(m.id) ?? []).length > 0 && (
            <ul className="mt-3 ml-6 space-y-3 border-l border-[var(--border)] pl-4">
              {(childrenMap.get(m.id) ?? []).map((child) => (
                <li key={child.id}>
                  <MessageItem
                    message={child}
                    locale={locale}
                    currentUserId={currentUserId}
                    isLiked={likedSet.has(String(child.id))}
                    likeCount={likeCounts[String(child.id)] ?? 0}
                    onLikeChange={(liked, count) => {
                      setLikedSet((s) => {
                        const next = new Set(s);
                        if (liked) next.add(String(child.id));
                        else next.delete(String(child.id));
                        return next;
                      });
                      setLikeCounts((c) => ({
                        ...c,
                        [String(child.id)]: count,
                      }));
                    }}
                    isEditing={editingId === child.id}
                    onStartEdit={() => setEditingId(child.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onReplyToggle={() => setReplyTo((cur) => (cur === m.id ? null : m.id))}
                    t={t}
                    tCommon={tCommon}
                    isReply
                  />
                </li>
              ))}
            </ul>
          )}

          {/* 回复输入框 */}
          {replyTo === m.id && currentUserId && (
            <div className="mt-3 ml-6 border-l border-[var(--border)] pl-4">
              <MessageComposer
                locale={locale}
                postSlug={postSlug}
                parentId={m.id}
                user={replyUser}
                showAuthPrompt={false}
                placeholder={locale === 'zh' ? `回复 @${m.name}…` : `Reply to @${m.name}…`}
                onPosted={() => setReplyTo(null)}
                onCancel={() => setReplyTo(null)}
                compact
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function findRootParent(msg: GuestbookMessage, all: GuestbookMessage[]): number {
  let current: GuestbookMessage | undefined = msg;
  // 防止循环引用：最多回溯 5 次
  for (let i = 0; i < 5 && current?.parentId != null; i++) {
    const parent = all.find((m) => m.id === current!.parentId);
    if (!parent) break;
    if (parent.parentId == null) return parent.id;
    current = parent;
  }
  return current?.id ?? msg.id;
}

interface MessageItemProps {
  message: GuestbookMessage;
  locale: 'en' | 'zh';
  currentUserId: string | null;
  isLiked: boolean;
  likeCount: number;
  onLikeChange: (liked: boolean, count: number) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onReplyToggle: () => void;
  isReply?: boolean;
  t: ReturnType<typeof useTranslations<'message'>>;
  tCommon: ReturnType<typeof useTranslations<'common'>>;
}

function MessageItem({
  message,
  locale,
  currentUserId,
  isLiked,
  likeCount,
  onLikeChange,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onReplyToggle,
  isReply,
  t,
  tCommon,
}: MessageItemProps) {
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [editBody, setEditBody] = useState(message.body);
  const [editPreview, setEditPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isAuthor = !!currentUserId && currentUserId === message.userId;

  // Markdown HTML（cached）
  const html = useMemo(() => renderSafeMarkdown(message.body), [message.body]);

  const handleLike = () => {
    if (!session?.user?.id) {
      toast.message(t('needLogin'));
      return;
    }
    // 乐观更新
    const optimisticLiked = !isLiked;
    const optimisticCount = likeCount + (optimisticLiked ? 1 : -1);
    onLikeChange(optimisticLiked, Math.max(0, optimisticCount));

    fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'message', targetId: String(message.id) }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { liked?: boolean; count?: number };
        if (typeof data.liked === 'boolean' && typeof data.count === 'number') {
          onLikeChange(data.liked, data.count);
        }
      })
      .catch(() => {
        // 回滚
        onLikeChange(isLiked, likeCount);
        toast.error(tCommon('error'));
      });
  };

  const handleEditSave = () => {
    const trimmed = editBody.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/guestbook/${message.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        });
        if (!res.ok) throw new Error('save failed');
        toast.success(t('editSaved'));
        onCancelEdit();
        // 刷新 RSC 让服务端拉到最新留言
        window.location.reload();
      } catch {
        toast.error(tCommon('error'));
      }
    });
  };

  const handleDeleteConfirmed = () => {
    setShowDeleteConfirm(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/guestbook/${message.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('delete failed');
        toast.success(t('deleted'));
        window.location.reload();
      } catch {
        toast.error(tCommon('error'));
      }
    });
  };

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4',
        isReply && 'bg-transparent',
      )}
    >
      {message.avatar && (
        <Image
          src={message.avatar}
          alt={message.name}
          width={36}
          height={36}
          className={cn('h-9 w-9 flex-shrink-0 rounded-full', isReply && 'h-7 w-7')}
          unoptimized
        />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{message.name}</span>
          <time
            className="font-mono text-xs text-[var(--muted)]"
            dateTime={
              message.createdAt instanceof Date
                ? message.createdAt.toISOString()
                : new Date(message.createdAt).toISOString()
            }
          >
            {formatDate(message.createdAt, locale)}
            {message.updatedAt && <span className="ml-1 italic">· {t('edited')}</span>}
          </time>
        </div>

        {/* body / 编辑器 */}
        {isEditing ? (
          <EditComposer
            body={editBody}
            onChange={setEditBody}
            textareaRef={editTextareaRef}
            preview={editPreview}
            onTogglePreview={() => setEditPreview((v) => !v)}
            onSave={handleEditSave}
            onCancel={onCancelEdit}
            pending={pending}
            t={t}
          />
        ) : (
          <div
            className="prose-message text-sm leading-relaxed [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-fg)] [&_code]:rounded [&_code]:bg-[var(--bg)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[var(--bg)] [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* 操作按钮行 */}
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-[var(--accent)]',
                isLiked && 'text-[var(--accent)]',
              )}
              aria-label={t('like')}
            >
              <Heart className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* 回复按钮：reply 自身不再允许回复，避免 3 级嵌套 */}
            {!isReply && currentUserId && (
              <button
                type="button"
                onClick={onReplyToggle}
                className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-[var(--fg)]"
              >
                <Reply className="h-3.5 w-3.5" />
                {t('reply')}
              </button>
            )}

            {isAuthor && (
              <>
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-[var(--fg)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('edit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={pending}
                  className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('delete')}
                </button>
                <ConfirmDialog
                  open={showDeleteConfirm}
                  title={t('confirmDelete')}
                  description={
                    locale === 'zh' ? '删除后无法恢复。' : 'This action cannot be undone.'
                  }
                  confirmLabel={t('delete')}
                  cancelLabel={tCommon('cancel')}
                  variant="danger"
                  onConfirm={handleDeleteConfirmed}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── EditComposer: 编辑留言的富文本编辑器（对齐回复区 MessageComposer 的样式） ── */

function EditComposer({
  body,
  onChange,
  textareaRef,
  preview,
  onTogglePreview,
  onSave,
  onCancel,
  pending,
  t,
}: {
  body: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  preview: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  t: ReturnType<typeof useTranslations<'message'>>;
}) {
  const insertMarkdown = (before: string, after: string = before, sample = '') => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(`${body}${before}${sample}${after}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || sample;
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-[var(--border)]">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <ToolbarBtn onClick={() => insertMarkdown('**', '**', t('boldSample'))} label="Bold">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => insertMarkdown('*', '*', t('italicSample'))} label="Italic">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => insertMarkdown('`', '`', 'code')} label="Code">
              <Code className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => insertMarkdown('[', '](https://)', t('linkSample'))}
              label="Link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>
          <button
            type="button"
            onClick={onTogglePreview}
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

        {/* 编辑区 / 预览区 */}
        {preview ? (
          <div
            className="min-h-[80px] bg-[var(--card)] p-3 text-sm [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-fg)] [&_code]:rounded [&_code]:bg-[var(--bg)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p]:my-1"
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
            onChange={(e) => onChange(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={pending}
            className="w-full resize-none border-0 bg-[var(--card)] p-3 text-sm outline-none"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--muted)]">
          {body.length}/1000 · {t('mdHint')}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            <X className="h-3 w-3" />
            {t('cancel')}
          </Button>
          <Button size="sm" onClick={onSave} disabled={pending || !body.trim()}>
            <Check className="h-3 w-3" />
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
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
