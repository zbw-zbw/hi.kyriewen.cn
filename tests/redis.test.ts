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
const setMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({ createLogger: () => loggerMock }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    set = setMock;
    constructor(public config: unknown) {}
  },
}));

const { getRedis, keepAliveRedis, resetRedisForTests } = await import('@/lib/redis');

const ORIGINAL_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  resetRedisForTests();
  loggerMock.error.mockReset();
  setMock.mockReset().mockResolvedValue('OK');
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

/**
 * 保活的存在理由：Upstash 对免费库「14 天无活动即删除」。
 * 上一次就是限流 fail-open → Redis 无流量 → 被删库 → 限流永久失效。
 */
describe('keepAliveRedis', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  });

  it('写入保活键，值为 ISO 时间戳（可当诊断信息看）', async () => {
    await expect(keepAliveRedis()).resolves.toBe(true);

    expect(setMock).toHaveBeenCalledTimes(1);
    const [key, value] = setMock.mock.calls[0] ?? [];
    expect(key).toBe('kw:keepalive');
    expect(new Date(String(value)).toISOString()).toBe(value);
  });

  it('Redis 抛错时返回 false 而不抛出（不能拖坠它依附的 cron）', async () => {
    setMock.mockRejectedValue(new Error('fetch failed'));

    await expect(keepAliveRedis()).resolves.toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'keepalive_failed',
      expect.any(Error),
      expect.objectContaining({ impact: expect.stringContaining('14d') }),
    );
  });

  it('未配置 Redis 时返回 false，不重复报错', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetRedisForTests();
    loggerMock.error.mockReset();

    await expect(keepAliveRedis()).resolves.toBe(false);
    // 只应有 getRedis 的那一条告警，不应额外再报 keepalive_failed
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.error.mock.calls[0]?.[0]).toBe('upstash_not_configured');
  });
});
