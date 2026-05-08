/**
 * Last.fm Web API 轻封装。
 *
 * 选型理由：
 * - Spotify Web API 自 2024 Q4 起要求 App 所有者必须是 Premium 订阅，
 *   免费账号 `/me/player/currently-playing` 和 `/me/player/recently-played`
 *   会稳定返回 403 "Active premium subscription required"
 * - Last.fm 免费、稳定，scrobble Spotify/Apple Music 后数据一致
 * - 只读 API 不需要 OAuth，只要一个 API Key
 *
 * 所需 env：
 *   - LASTFM_API_KEY（必填，https://www.last.fm/api/account/create 申请）
 *   - LASTFM_USERNAME（必填，你的 Last.fm 用户名，不是显示名）
 *
 * 推荐前置：
 *   Last.fm → Settings → Applications → Spotify → Connect
 *   这样 Spotify 每次播放都会 scrobble 到 Last.fm。
 */

const API_BASE = 'https://ws.audioscrobbler.com/2.0/';

export interface LastfmTrack {
  title: string;
  artist: string;
  album: string;
  albumImage: string | null;
  url: string;
  /** ISO 时间字符串。正在播放时为 undefined */
  playedAt?: string;
  /** 是否正在播放 */
  isPlaying?: boolean;
}

export function hasCredentials() {
  return Boolean(process.env.LASTFM_API_KEY && process.env.LASTFM_USERNAME);
}

// Last.fm 原始响应类型（只声明我们会用到的字段）
interface LastfmImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
}

interface LastfmRawTrack {
  name: string;
  artist: { '#text'?: string; name?: string } | string;
  album?: { '#text'?: string };
  image?: LastfmImage[];
  url?: string;
  date?: { uts: string; '#text': string };
  '@attr'?: { nowplaying?: string };
}

interface RecentTracksResponse {
  recenttracks?: {
    track?: LastfmRawTrack[] | LastfmRawTrack;
  };
  error?: number;
  message?: string;
}

function pickImage(images: LastfmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // 偏好 extralarge → large → mega → 第一个有值的
  const preferred = ['extralarge', 'mega', 'large', 'medium', 'small'] as const;
  for (const size of preferred) {
    const found = images.find((i) => i.size === size && i['#text']);
    if (found) return found['#text'];
  }
  const first = images.find((i) => i['#text']);
  return first?.['#text'] ?? null;
}

function artistName(
  artist: LastfmRawTrack['artist']
): string {
  if (typeof artist === 'string') return artist;
  return artist['#text'] ?? artist.name ?? '';
}

function normalize(raw: LastfmRawTrack): LastfmTrack {
  const isPlaying = raw['@attr']?.nowplaying === 'true';
  return {
    title: raw.name,
    artist: artistName(raw.artist),
    album: raw.album?.['#text'] ?? '',
    albumImage: pickImage(raw.image),
    url: raw.url ?? '',
    playedAt: raw.date?.uts
      ? new Date(Number(raw.date.uts) * 1000).toISOString()
      : undefined,
    isPlaying,
  };
}

/**
 * 拉取最近 N 条播放（含正在播放）。
 *
 * Last.fm 的 getRecentTracks 接口有个特性：
 * 当用户正在播放时，响应里第一条 track 带 @attr.nowplaying='true'，
 * 但总数仍然是 limit；当没在播时，第一条就是最近一条历史。
 */
async function getRecentTracksRaw(limit = 6): Promise<LastfmRawTrack[]> {
  if (!hasCredentials()) {
    console.warn(
      '[lastfm] missing env: API_KEY=',
      Boolean(process.env.LASTFM_API_KEY),
      'USERNAME=',
      Boolean(process.env.LASTFM_USERNAME)
    );
    return [];
  }

  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: process.env.LASTFM_USERNAME!,
    api_key: process.env.LASTFM_API_KEY!,
    format: 'json',
    limit: String(limit),
    extended: '0',
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      next: { revalidate: 60 }, // 1 分钟缓存
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(
        '[lastfm] recent-tracks failed',
        res.status,
        text.slice(0, 300)
      );
      return [];
    }

    const data = (await res.json()) as RecentTracksResponse;

    if (data.error) {
      console.error(
        '[lastfm] api error',
        data.error,
        data.message ?? 'unknown'
      );
      return [];
    }

    const raw = data.recenttracks?.track;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  } catch (err) {
    console.error('[lastfm] recent-tracks error', err);
    return [];
  }
}

/**
 * 当前是否正在播放；是则返回曲目，否则 null。
 */
export async function getNowPlaying(): Promise<LastfmTrack | null> {
  const tracks = await getRecentTracksRaw(1);
  const first = tracks[0];
  if (!first) return null;
  if (first['@attr']?.nowplaying !== 'true') return null;
  return normalize(first);
}

/**
 * 返回最近 N 条历史播放（不含正在播放）。
 */
export async function getRecentlyPlayed(limit = 5): Promise<LastfmTrack[]> {
  // 多拿 1 条，万一首条是 nowplaying，需要剔除后再截取
  const tracks = await getRecentTracksRaw(limit + 1);
  return tracks
    .filter((t) => t['@attr']?.nowplaying !== 'true')
    .slice(0, limit)
    .map(normalize);
}
