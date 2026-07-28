import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/redis';

/**
 * 命名限流器。
 *
 * 原先只有留言一个限流器，导致其余写端点/成本端点完全没有配额：
 * - /api/chat        每次调用都在烧 LLM token
 * - /api/newsletter  可向任意邮箱触发本站域名发信（声誉风险）
 * - /api/views       无鉴权的无限 upsert，可灌满 page_views 表
 * - /api/likes       无限写入
 *
 * 未配置 Upstash 时所有限流器返回 null（调用方放行）—— 这是有意的降级：
 * 限流是防滥用而非鉴权，不应因缓存不可用而让站点不可用。
 */

export type LimiterName = 'guestbook' | 'chat' | 'views' | 'newsletter' | 'likes';

/** 每个限流器的配额：[请求数, 窗口] */
const QUOTA: Record<LimiterName, Parameters<typeof Ratelimit.slidingWindow>> = {
  guestbook: [1, '60 s'],
  chat: [10, '60 s'],
  views: [30, '60 s'],
  // 发信端点收得最紧：一个 IP 一小时最多 3 次订阅尝试
  newsletter: [3, '3600 s'],
  likes: [30, '60 s'],
};

const limiters = new Map<LimiterName, Ratelimit>();

export function getRateLimiter(name: LimiterName): Ratelimit | null {
  const cached = limiters.get(name);
  if (cached) return cached;

  const client = getRedis();
  if (!client) return null;

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(...QUOTA[name]),
    analytics: true,
    prefix: `kw:${name}`,
  });
  limiters.set(name, limiter);
  return limiter;
}

/**
 * 取客户端 IP。Vercel 会设置 x-forwarded-for，取链首个地址。
 *
 * 注意：IP 可伪造/共享，因此仅用于防滥用配额，绝不用于鉴权。
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * 便捷封装：超限时返回可直接 return 的 429 响应，否则返回 null。
 */
export async function enforceRateLimit(name: LimiterName, key: string): Promise<Response | null> {
  const limiter = getRateLimiter(name);
  if (!limiter) return null;

  const { success, reset } = await limiter.limit(key);
  if (success) return null;

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
