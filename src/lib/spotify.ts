/**
 * Spotify Web API 轻封装。
 * 使用 Refresh Token 流程：
 *   1. 开发者在本地用 OAuth 授权一次，拿到 refresh_token（永久有效）
 *   2. 运行时用 refresh_token 换短期 access_token（60 分钟）
 *   3. 用 access_token 调业务接口
 *
 * 所需 env：
 *   - SPOTIFY_CLIENT_ID
 *   - SPOTIFY_CLIENT_SECRET
 *   - SPOTIFY_REFRESH_TOKEN
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL =
  'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_URL =
  'https://api.spotify.com/v1/me/player/recently-played?limit=5';

export interface SpotifyTrack {
  title: string;
  artist: string;
  album: string;
  albumImage: string | null;
  url: string;
  playedAt?: string;
  isPlaying?: boolean;
}

function hasCredentials() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string | null> {
  if (!hasCredentials()) {
    console.warn(
      '[spotify] missing env: CLIENT_ID=',
      Boolean(process.env.SPOTIFY_CLIENT_ID),
      'CLIENT_SECRET=',
      Boolean(process.env.SPOTIFY_CLIENT_SECRET),
      'REFRESH_TOKEN=',
      Boolean(process.env.SPOTIFY_REFRESH_TOKEN)
    );
    return null;
  }

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
      }),
      next: { revalidate: 60 * 50 }, // 50 分钟（token 60 分钟失效，留出余量）
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(
        '[spotify] token refresh failed',
        res.status,
        text.slice(0, 300)
      );
      return null;
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      console.error('[spotify] token refresh ok but no access_token in body');
    }
    return data.access_token ?? null;
  } catch (err) {
    console.error('[spotify] token refresh error', err);
    return null;
  }
}

interface SpotifyTrackResponse {
  name: string;
  album?: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  artists: { name: string }[];
  external_urls: { spotify: string };
}

function normalizeTrack(
  track: SpotifyTrackResponse,
  extras: { playedAt?: string; isPlaying?: boolean } = {}
): SpotifyTrack {
  return {
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album?.name ?? '',
    albumImage: track.album?.images?.[0]?.url ?? null,
    url: track.external_urls.spotify,
    playedAt: extras.playedAt,
    isPlaying: extras.isPlaying,
  };
}

export async function getNowPlaying(): Promise<SpotifyTrack | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(NOW_PLAYING_URL, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 }, // 1 分钟缓存
    });

    if (res.status === 204 || res.status > 400) return null; // 没在播
    const data = (await res.json()) as {
      is_playing?: boolean;
      item?: SpotifyTrackResponse;
    };
    if (!data.item) return null;
    return normalizeTrack(data.item, { isPlaying: data.is_playing });
  } catch (err) {
    console.error('[spotify] now-playing error', err);
    return null;
  }
}

export async function getRecentlyPlayed(): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(RECENTLY_PLAYED_URL, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 * 5 }, // 5 分钟缓存
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: { track: SpotifyTrackResponse; played_at: string }[];
    };
    return (
      data.items?.map((i) => normalizeTrack(i.track, { playedAt: i.played_at })) ??
      []
    );
  } catch (err) {
    console.error('[spotify] recently-played error', err);
    return [];
  }
}
