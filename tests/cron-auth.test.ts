import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authorizeCron, secretEquals } from '@/lib/cron-auth';

/**
 * 锁定 cron / revalidate 的鉴权语义。
 *
 * 修复前的实现是 `if (!secret) return true` —— 一次环境变量误删就能把
 * 这些写库端点变成公开接口，且没有任何信号。这里第一条用例就是防这个。
 */

const ORIGINAL = process.env.CRON_SECRET;

function request(authorization?: string): Request {
  return new Request('https://hi.kyriewen.cn/api/cron/github-stats', {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = 'correct-horse-battery-staple';
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe('authorizeCron', () => {
  it('未配置 CRON_SECRET 时必须拒绝（fail-closed）', () => {
    delete process.env.CRON_SECRET;
    expect(authorizeCron(request('Bearer anything'))).toBe(false);
    expect(authorizeCron(request())).toBe(false);
  });

  it('正确的 Bearer token 通过', () => {
    expect(authorizeCron(request('Bearer correct-horse-battery-staple'))).toBe(true);
  });

  it('错误的 token 拒绝', () => {
    expect(authorizeCron(request('Bearer wrong'))).toBe(false);
  });

  it('缺少 Authorization 头拒绝', () => {
    expect(authorizeCron(request())).toBe(false);
  });

  it('仅前缀匹配不算通过', () => {
    expect(authorizeCron(request('Bearer correct-horse'))).toBe(false);
  });

  it('缺少 Bearer 前缀拒绝', () => {
    expect(authorizeCron(request('correct-horse-battery-staple'))).toBe(false);
  });
});

describe('secretEquals', () => {
  it('相等返回 true', () => {
    expect(secretEquals('abc', 'abc')).toBe(true);
  });

  it('不等返回 false', () => {
    expect(secretEquals('abc', 'abd')).toBe(false);
  });

  it('长度不同也能安全比较，不抛异常', () => {
    // 先摘要再比较，长度固定，不会像裸 timingSafeEqual 那样因长度不等抛错
    expect(secretEquals('short', 'a-much-longer-secret')).toBe(false);
    expect(secretEquals('', 'x')).toBe(false);
  });

  it('空串与空串相等', () => {
    expect(secretEquals('', '')).toBe(true);
  });
});
