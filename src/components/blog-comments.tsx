'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GuestbookMessage } from '@/lib/db';
import { GuestbookAuth } from '@/components/guestbook-auth';
import { MessageComposer } from '@/components/message-composer';
import { MessageThread } from '@/components/message-thread';

interface BlogCommentsProps {
  slug: string;
  locale: 'en' | 'zh';
  initialComments: GuestbookMessage[];
  initialLikes: { counts: Record<string, number>; mine: string[] };
  currentUserId: string | null;
  user: { name: string; image?: string | null } | null;
}

/**
 * 博客评论区客户端包装组件。
 * 评论发布/编辑/删除后通过 API 增量获取最新数据，
 * 避免 router.refresh() 导致整个博客页面（含 MDX 正文）重新渲染。
 */
export function BlogComments({
  slug,
  locale,
  initialComments,
  initialLikes,
  currentUserId,
  user,
}: BlogCommentsProps) {
  const tMsg = useTranslations('message');
  const [comments, setComments] = useState(initialComments);
  const [likesData, setLikesData] = useState(initialLikes);

  /** 增量刷新评论数据：仅重新获取评论列表，不触发整页 RSC 刷新 */
  const refreshComments = useCallback(async () => {
    try {
      const [commentsRes, likesRes] = await Promise.all([
        fetch(`/api/guestbook?postSlug=${encodeURIComponent(slug)}`),
        currentUserId
          ? fetch(
              `/api/likes?targetType=message&targetIds=all&postSlug=${encodeURIComponent(slug)}`,
            )
          : Promise.resolve(null),
      ]);

      const commentsData = (await commentsRes.json()) as { messages?: GuestbookMessage[] };
      if (commentsData.messages) {
        setComments(commentsData.messages);
      }

      if (likesRes) {
        const newLikes = (await likesRes.json()) as {
          counts?: Record<string, number>;
          mine?: string[];
        };
        if (newLikes.counts || newLikes.mine) {
          setLikesData({
            counts: newLikes.counts ?? likesData.counts,
            mine: newLikes.mine ?? likesData.mine,
          });
        }
      }
    } catch {
      // 增量刷新失败时静默降级，不影响用户体验
    }
  }, [slug, currentUserId, likesData]);

  return (
    <section id="comments" className="mt-16 space-y-4 border-t border-[var(--border)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold tracking-tight">
          {tMsg('commentsHeading', { count: comments.length })}
        </h3>
        <GuestbookAuth locale={locale} user={user} />
      </div>

      <MessageComposer
        locale={locale}
        user={user}
        postSlug={slug}
        parentId={null}
        onMutate={refreshComments}
      />

      <MessageThread
        messages={comments}
        postSlug={slug}
        locale={locale}
        initialLikes={likesData}
        currentUserId={currentUserId}
        onMutate={refreshComments}
      />
    </section>
  );
}
