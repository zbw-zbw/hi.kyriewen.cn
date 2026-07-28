import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * requireAdmin 的行为测试。
 *
 * 这是后台鉴权的第二层防线（第一层是 middleware）。它必须能区分三种状态：
 * 未登录 → 401，已登录但非管理员 → 403，管理员 → 放行。
 *
 * 「已登录但非管理员」这一条是重点：主站对任意 GitHub 用户开放登录，
 * 只判断「有会话」等于放行所有人。
 */

const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({ auth: authMock }));

const { requireAdmin } = await import('@/lib/guard');

beforeEach(() => {
  authMock.mockReset();
});

describe('requireAdmin', () => {
  it('无会话时返回 401', async () => {
    authMock.mockResolvedValue(null);

    const denied = await requireAdmin();
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(401);
    await expect(denied?.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('有会话但缺 user 时返回 401', async () => {
    authMock.mockResolvedValue({});

    expect((await requireAdmin())?.status).toBe(401);
  });

  it('已登录但非管理员时返回 403（关键用例）', async () => {
    authMock.mockResolvedValue({ user: { id: '999', isAdmin: false } });

    const denied = await requireAdmin();
    expect(denied?.status).toBe(403);
    await expect(denied?.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it('isAdmin 缺失（undefined）时也必须拒绝，而不是当作放行', async () => {
    authMock.mockResolvedValue({ user: { id: '999' } });

    expect((await requireAdmin())?.status).toBe(403);
  });

  it('isAdmin 为真值字符串等非 true 值时仍拒绝', async () => {
    // 断言用的是 !== true，避免任何隐式转换导致的放行
    authMock.mockResolvedValue({ user: { id: '999', isAdmin: 'yes' } });

    expect((await requireAdmin())?.status).toBe(403);
  });

  it('管理员放行（返回 null）', async () => {
    authMock.mockResolvedValue({ user: { id: '123', isAdmin: true } });

    expect(await requireAdmin()).toBeNull();
  });

  it('auth() 抛错时拒绝而不是崩溃', async () => {
    authMock.mockRejectedValue(new Error('JWT decryption failed'));

    expect((await requireAdmin())?.status).toBe(401);
  });
});
