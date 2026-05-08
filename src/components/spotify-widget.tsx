import Image from 'next/image';
import { Music, ExternalLink } from 'lucide-react';
import {
  getNowPlaying,
  getRecentlyPlayed,
  hasCredentials,
} from '@/lib/spotify';
import { cn } from '@/lib/utils';

interface SpotifyWidgetProps {
  locale: 'en' | 'zh';
  className?: string;
}

function formatRelative(iso: string | undefined, locale: 'en' | 'zh') {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return locale === 'zh' ? '刚刚' : 'just now';
  if (mins < 60)
    return locale === 'zh' ? `${mins} 分钟前` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24)
    return locale === 'zh' ? `${hours} 小时前` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return locale === 'zh' ? `${days} 天前` : `${days}d ago`;
}

export async function SpotifyWidget({ locale, className }: SpotifyWidgetProps) {
  const [nowPlaying, recent] = await Promise.all([
    getNowPlaying(),
    getRecentlyPlayed(),
  ]);

  if (!nowPlaying && recent.length === 0) {
    // 区分两类空态：env 缺失 vs 有凭据但最近没播过
    const credsOk = hasCredentials();
    const hint = !credsOk
      ? locale === 'zh'
        ? 'Spotify 未配置（缺少环境变量）。'
        : 'Spotify not configured (missing env vars).'
      : locale === 'zh'
        ? '最近没有播放记录，或 Spotify API 暂时不可用。'
        : 'No recent tracks, or Spotify API is unavailable.';
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]',
          className
        )}
      >
        <Music className="h-4 w-4" />
        <span>{hint}</span>
      </div>
    );
  }

  const current = nowPlaying ?? recent[0];
  const rest = nowPlaying ? recent.slice(0, 4) : recent.slice(1, 5);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]',
        className
      )}
    >
      {current && (
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 border-b border-[var(--border)] p-4 transition-colors hover:bg-[var(--bg)]"
        >
          {current.albumImage ? (
            <Image
              src={current.albumImage}
              alt={current.album}
              width={56}
              height={56}
              className="h-14 w-14 flex-shrink-0 rounded"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded bg-[var(--bg)]">
              <Music className="h-5 w-5 text-[var(--muted)]" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  current.isPlaying
                    ? 'animate-pulse bg-green-500'
                    : 'bg-[var(--muted)]'
                )}
              />
              <span>
                {current.isPlaying
                  ? locale === 'zh'
                    ? '正在播放'
                    : 'Now playing'
                  : locale === 'zh'
                    ? '最近播放'
                    : 'Last played'}
              </span>
              {!current.isPlaying && current.playedAt && (
                <span className="font-mono">
                  · {formatRelative(current.playedAt, locale)}
                </span>
              )}
            </div>
            <div className="truncate font-medium">{current.title}</div>
            <div className="truncate text-sm text-[var(--muted-fg)]">
              {current.artist}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
      )}

      {rest.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {rest.map((track, idx) => (
            <li key={`${track.url}-${idx}`}>
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-[var(--bg)]"
              >
                <span className="flex-1 truncate">
                  <span className="font-medium">{track.title}</span>
                  <span className="text-[var(--muted)]"> — {track.artist}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {formatRelative(track.playedAt, locale)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
