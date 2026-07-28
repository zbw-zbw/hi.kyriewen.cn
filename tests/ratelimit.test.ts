import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clientIp } from '@/lib/ratelimit';

/**
 * 限流键的取值逻辑。
 *
 * clientIp 只用于防滥用配额，不用于鉴权 —— x-forwarded-for 是可伪造的。
 * 这里锁定的是「取链首个地址」和「缺头时不抛异常」两点。
 */

const UPSTASH_KEYS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const;
const ORIGINAL: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of UPSTASH_KEYS) {
    ORIGINAL[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of UPSTASH_KEYS) {
    const value = ORIGINAL[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://hi.kyriewen.cn/api/chat', { headers });
}

describe('clientIp', () => {
  it('取 x-forwarded-for 链上的首个地址', () => {
    const ip = clientIp(
      requestWith({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }),
    );
    expect(ip).toBe('203.0.113.7');
  });

  it('容忍首个地址前后的空格', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': '  203.0.113.7 , 70.41.3.18' }))).toBe(
      '203.0.113.7',
    );
  });

  it('没有 x-forwarded-for 时回退 x-real-ip', () => {
    expect(clientIp(requestWith({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
  });

  it('两个头都没有时返回 unknown，而不是抛异常', () => {
    expect(clientIp(requestWith({}))).toBe('unknown');
  });

  it('x-forwarded-for 为空串时回退', () => {
    expect(clientIp(requestWith({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.9' }))).toBe(
      '198.51.100.9',
    );
  });
});

describe('未配置 Upstash 时的降级', () => {
  it('enforceRateLimit 放行而不是报错', async () => {
    // 限流是防滥用而非鉴权，缓存不可用不应让站点不可用
    const { enforceRateLimit } = await import('@/lib/ratelimit');
    await expect(enforceRateLimit('chat', 'ip:1.2.3.4')).resolves.toBeNull();
  });
});
