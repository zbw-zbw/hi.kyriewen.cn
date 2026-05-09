import { Music2 } from 'lucide-react';
import { getNowPlaying, getRecentlyPlayed } from '@/lib/lastfm';
import { cn } from '@/lib/utils';

/**
 * 行内 Now Playing 组件 — Lee Robinson 招牌的散文嵌入式音乐状态。
 *
 * 这是 React Server Component，直接调 src/lib/lastfm.ts。
 * 优先显示"正在播放"，否则显示"最近播放的一首"，再降级为 fallback 文案。
 *
 * Last.fm API 走 fetch + next: { revalidate: 60 } 缓存（见 lastfm.ts），
 * 所以不会每次渲染都打 API；构建时为静态预渲染。
 *
 * 用法（在散文 Hero 中）：
 *   I'm currently listening to <NowPlayingInline />.
 */

interface NowPlayingInlineProps {
  /** 降级文案：API 未配置或拉不到数据时显示。默认 "music"。 */
  fallback?: string;
  /** 是否显示"♪"图标，默认 true。 */
  showIcon?: boolean;
  className?: string;
}

export async function NowPlayingInline({
  fallback = 'music',
  showIcon = true,
  className,
}: NowPlayingInlineProps) {
  // 优先取 now playing，否则取最近一条
  let track = await getNowPlaying();
  if (!track) {
    const recent = await getRecentlyPlayed(1);
    track = recent[0] ?? null;
  }

  if (!track) {
    return (
      <span
        className={cn(
          'underline decoration-[var(--border)] decoration-1 underline-offset-4',
          className
        )}
      >
        {fallback}
      </span>
    );
  }

  const label = `${track.title} — ${track.artist}`;
  const content = (
    <span className="inline-flex items-baseline gap-1">
      {showIcon && (
        <Music2 className="h-[0.9em] w-[0.9em] translate-y-[1px] text-[var(--accent)]" />
      )}
      <span>
        <span className="font-medium">{track.title}</span>
        <span className="text-[var(--muted)]"> by {track.artist}</span>
      </span>
    </span>
  );

  if (track.url) {
    return (
      <a
        href={track.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${track.isPlaying ? 'Now playing' : 'Last played'}: ${label}`}
        className={cn(
          'underline decoration-[var(--border)] decoration-1 underline-offset-4 transition-colors hover:decoration-[var(--accent)]',
          className
        )}
      >
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}
