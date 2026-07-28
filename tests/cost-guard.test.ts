import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 每日成本预算护栏的行为。
 *
 * 最关键的一条是「触顶必须拒绝」—— 这是唯一挡在意外账单前面的逻辑。
 * 第二关键的是「Redis 不可用时放行但必须打 error 日志」：
 * 这是有意的 fail-open 取舍，若日志静默，护栏失效就无人知晓。
 */

const redisMock = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
}));
const getRedisMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({ getRedis: getRedisMock }));
vi.mock('@/lib/logger', () => ({ createLogger: () => loggerMock }));

const { consumeDailyBudget } = await import('@/lib/cost-guard');

beforeEach(() => {
  redisMock.incr.mockReset();
  redisMock.expire.mockReset();
  getRedisMock.mockReset().mockReturnValue(redisMock);
  loggerMock.warn.mockReset();
  loggerMock.error.mockReset();
});

describe('consumeDailyBudget', () => {
  it('额度内放行', async () => {
    redisMock.incr.mockResolvedValue(1);

    const result = await consumeDailyBudget('ai-chat');

    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(false);
    expect(result.used).toBe(1);
  });

  it('首次计数时设置过期时间，避免键永久驻留', async () => {
    redisMock.incr.mockResolvedValue(1);

    await consumeDailyBudget('ai-chat');

    expect(redisMock.expire).toHaveBeenCalledTimes(1);
  });

  it('非首次计数不重复设置过期（否则窗口会被无限延长）', async () => {
    redisMock.incr.mockResolvedValue(7);

    await consumeDailyBudget('ai-chat');

    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('恰好等于上限时仍放行', async () => {
    redisMock.incr.mockResolvedValue(300);

    const result = await consumeDailyBudget('ai-chat');

    expect(result.allowed).toBe(true);
  });

  it('超出上限时拒绝，并打出可告警的 error 日志（核心用例）', async () => {
    redisMock.incr.mockResolvedValue(301);

    const result = await consumeDailyBudget('ai-chat');

    expect(result.allowed).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'budget_exceeded',
      undefined,
      expect.objectContaining({ budget: 'ai-chat', used: 301, limit: 300 }),
    );
  });

  it('达到 80% 时预警', async () => {
    redisMock.incr.mockResolvedValue(240); // 300 * 0.8

    await consumeDailyBudget('ai-chat');

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'budget_near_limit',
      expect.objectContaining({ budget: 'ai-chat' }),
    );
  });

  it('发信预算与 AI 预算互相独立', async () => {
    redisMock.incr.mockResolvedValue(81); // 超过 newsletter 的 80，但远低于 ai-chat 的 300

    expect((await consumeDailyBudget('newsletter-welcome')).allowed).toBe(false);
    expect((await consumeDailyBudget('ai-chat')).allowed).toBe(true);
  });

  it('未配置 Redis 时放行，但必须打 error 日志（护栏失效不能静默）', async () => {
    getRedisMock.mockReturnValue(null);

    const result = await consumeDailyBudget('ai-chat');

    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(true);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'budget_unprotected',
      undefined,
      expect.objectContaining({ reason: 'upstash_not_configured' }),
    );
  });

  it('Redis 抛错时放行且记录，不让缓存故障拖垮功能', async () => {
    redisMock.incr.mockRejectedValue(new Error('ECONNRESET'));

    const result = await consumeDailyBudget('ai-chat');

    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(true);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'budget_check_failed',
      expect.any(Error),
      expect.objectContaining({ budget: 'ai-chat' }),
    );
  });
});
