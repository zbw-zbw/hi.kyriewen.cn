import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 限流器的故障降级。
 *
 * 这组用例源于一次真实的生产事故：enforceRateLimit 原先没有 try/catch，
 * Upstash 在生产不可用时异常直接冒泡，把 chat / views / guestbook / likes /
 * newsletter 所有写端点变成 500 —— 防滥用措施本身成了故障源。
 *
 * 不变式：限流是防滥用的辅助手段，不是鉴权。它自身故障时必须放行，
 * 绝不能让端点挂掉。
 */

const limitMock = vi.hoisted(() => vi.fn());
const getRedisMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('@/lib/redis', () => ({ getRedis: getRedisMock }));
vi.mock('@/lib/logger', () => ({ createLogger: () => loggerMock }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = (...args: unknown[]) => args;
    limit = limitMock;
  },
}));

const { enforceRateLimit, resetRateLimitersForTests } = await import('@/lib/ratelimit');

beforeEach(() => {
  // limiters 是模块级缓存，不清会让用例之间相互影响
  resetRateLimitersForTests();
  limitMock.mockReset();
  getRedisMock.mockReset().mockReturnValue({});
  loggerMock.error.mockReset();
});

describe('enforceRateLimit 的降级行为', () => {
  it('Upstash 抛错时放行，而不是让端点 500（核心用例）', async () => {
    limitMock.mockRejectedValue(new Error('fetch failed'));

    // 不抛异常，且返回 null（放行）
    await expect(enforceRateLimit('views', 'ip:1.2.3.4')).resolves.toBeNull();
    expect(loggerMock.error).toHaveBeenCalledWith(
      'ratelimit_unavailable',
      expect.any(Error),
      expect.objectContaining({ limiter: 'views' }),
    );
  });

  it('凭据无效导致的 401 类错误同样放行', async () => {
    limitMock.mockRejectedValue(new Error('Upstash: 401 Unauthorized'));

    await expect(enforceRateLimit('chat', 'ip:1.2.3.4')).resolves.toBeNull();
  });

  it('未配置 Redis 时放行（未配置告警由 redis 模块负责）', async () => {
    // 本文件 mock 了 @/lib/redis，所以不会触发真实的 upstash_not_configured
    // 告警；那条告警的行为在 tests/redis.test.ts 里验证。
    // 这里只关心一件事：拿不到限流器时必须放行。
    getRedisMock.mockReturnValue(null);

    await expect(enforceRateLimit('chat', 'ip:1.2.3.4')).resolves.toBeNull();
  });

  it('额度内放行', async () => {
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });

    await expect(enforceRateLimit('likes', 'user:1')).resolves.toBeNull();
  });

  it('超限时返回 429 并带 Retry-After', async () => {
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 30_000 });

    const response = await enforceRateLimit('guestbook', 'user:1');

    expect(response?.status).toBe(429);
    const retryAfter = Number(response?.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });
});
