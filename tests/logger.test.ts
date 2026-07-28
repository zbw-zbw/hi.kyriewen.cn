import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/lib/logger';

/**
 * 结构化日志的输出契约。
 *
 * 生产环境必须是单行 JSON 且带 level / scope / event 字段 ——
 * Vercel 的日志查询与 Log Drains 靠这些字段建告警规则。
 * 一旦退回自由文本，告警就会静默失效，所以这里要锁住格式。
 */

const ORIGINAL_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string): void {
  // NODE_ENV 在类型上是只读的联合类型，测试里需要强行改写
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  setNodeEnv(ORIGINAL_ENV ?? 'test');
  vi.restoreAllMocks();
});

describe('生产环境：单行 JSON', () => {
  beforeEach(() => setNodeEnv('production'));

  it('error 输出可被 JSON.parse，且含 level/scope/event', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('api/chat').error('stream_failed', new Error('boom'));

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));

    expect(payload.level).toBe('error');
    expect(payload.scope).toBe('api/chat');
    expect(payload.event).toBe('stream_failed');
    expect(payload.time).toBeTypeOf('string');
  });

  it('Error 被序列化为 name/message/stack，而不是变成空对象', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('s').error('failed', new TypeError('bad input'));

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    // JSON.stringify(new Error()) 默认是 {}，必须显式序列化
    expect(payload.error.name).toBe('TypeError');
    expect(payload.error.message).toBe('bad input');
    expect(payload.error.stack).toBeTypeOf('string');
  });

  it('非 Error 抛出物也能被记录', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('s').error('failed', 'just a string');

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.error.name).toBe('NonError');
    expect(payload.error.message).toBe('just a string');
  });

  it('自定义 fields 平铺进 JSON', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createLogger('cost-guard').warn('budget_near_limit', { budget: 'ai-chat', used: 240 });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.budget).toBe('ai-chat');
    expect(payload.used).toBe(240);
  });

  it('未传 error 时不产生 error 字段', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('s').error('budget_exceeded', undefined, { budget: 'ai-chat' });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect('error' in payload).toBe(false);
    expect(payload.budget).toBe('ai-chat');
  });

  it('各级别落到对应的 console 方法（便于按 stderr/stdout 分流）', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const log = createLogger('s');
    log.error('e');
    log.warn('w');
    log.info('i');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});

describe('开发环境：人类可读', () => {
  beforeEach(() => setNodeEnv('development'));

  it('输出带 [scope] 前缀而非 JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('api/views').error('post_failed');

    expect(spy.mock.calls[0]?.[0]).toBe('[api/views] post_failed');
  });
});
