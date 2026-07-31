import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Upstash 客户端的配置缺失告警。
 *
 * 这组用例源于一次真实的生产问题：Vercel 面板上没有配 Upstash 变量，
 * 而 getRedis() 静默返回 null，于是限流与成本护栏两道防护同时失效、
 * 长期无人知晓 —— 最后是靠手工连发 35 次请求才发现零个 429。
 *
 * 不变式：配置缺失可以降级，但绝不能静默。
 */

const loggerMock = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('@/lib/logger', () => ({ createLogger: () => loggerMock }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(public config: unknown) {}
  },
}));

const { getRedis, resetRedisForTests } = await import('@/lib/redis');

const ORIGINAL_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  resetRedisForTests();
  loggerMock.error.mockReset();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_URL;
  if (ORIGINAL_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_TOKEN;
  resetRedisForTests();
});

describe('getRedis 配置缺失时的告警', () => {
  it('两个变量都缺时返回 null 并打 error 日志（核心用例）', () => {
    expect(getRedis()).toBeNull();

    expect(loggerMock.error).toHaveBeenCalledWith(
      'upstash_not_configured',
      undefined,
      expect.objectContaining({ impact: 'rate_limiting_and_cost_guard_disabled' }),
    );
  });

  it('日志里列出到底缺哪个变量，便于直接定位', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    // 只缺 token

    expect(getRedis()).toBeNull();

    const fields = loggerMock.error.mock.calls[0]?.[2] as { missing: string[] };
    expect(fields.missing).toEqual(['UPSTASH_REDIS_REST_TOKEN']);
  });

  it('告警只打一次，不随每个请求刷日志', () => {
    getRedis();
    getRedis();
    getRedis();

    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('配置完整时返回客户端且不告警', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    expect(getRedis()).not.toBeNull();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('客户端被单例复用', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    expect(getRedis()).toBe(getRedis());
  });
});
