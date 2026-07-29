import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * /api/chat 的扣费时机。
 *
 * 这组用例存在的原因是一个我自己引入过的 bug：护栏原本在解析请求体之前扣减，
 * 于是 300 个格式错误的 POST 就能耗尽当日额度而一次 LLM 都不调用 ——
 * 成本护栏反而变成廉价的功能拒绝服务通道。
 *
 * 不变式：额度只能在「所有校验通过 + 即将真正调用模型」时扣减。
 */

const budgetMock = vi.hoisted(() => vi.fn());
const streamTextMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/cost-guard', () => ({ consumeDailyBudget: budgetMock }));
vi.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: enforceRateLimitMock,
  clientIp: () => '203.0.113.7',
}));
vi.mock('ai', () => ({ streamText: streamTextMock }));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => ({ chat: () => 'fake-model' }),
}));

process.env.AI_API_KEY = 'test-key';

const { POST } = await import('@/app/api/chat/route');

function post(body: string): Request {
  return new Request('https://hi.kyriewen.cn/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  budgetMock.mockReset().mockResolvedValue({ allowed: true, used: 1, limit: 300, degraded: false });
  enforceRateLimitMock.mockReset().mockResolvedValue(null);
  streamTextMock.mockReset().mockReturnValue({
    toTextStreamResponse: () => new Response('ok'),
  });
});

describe('额度只在真正花钱时扣减', () => {
  it('请求体不是合法 JSON 时不扣额度（核心用例）', async () => {
    const response = await POST(post('not json at all'));

    expect(response.status).toBe(400);
    expect(budgetMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it('缺少 messages 时不扣额度', async () => {
    const response = await POST(post(JSON.stringify({})));

    expect(response.status).toBe(400);
    expect(budgetMock).not.toHaveBeenCalled();
  });

  it('messages 为空数组时不扣额度', async () => {
    const response = await POST(post(JSON.stringify({ messages: [] })));

    expect(response.status).toBe(400);
    expect(budgetMock).not.toHaveBeenCalled();
  });

  it('messages 全是无效项时不扣额度', async () => {
    const response = await POST(post(JSON.stringify({ messages: [{ foo: 'bar' }] })));

    expect(response.status).toBe(400);
    expect(budgetMock).not.toHaveBeenCalled();
  });

  it('被限流拦下时不扣额度（限流应先于扣费）', async () => {
    enforceRateLimitMock.mockResolvedValue(new Response(null, { status: 429 }));

    await POST(post(JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })));

    expect(budgetMock).not.toHaveBeenCalled();
  });

  it('校验全部通过时才扣额度并调用模型', async () => {
    const response = await POST(
      post(JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })),
    );

    expect(response.status).toBe(200);
    expect(budgetMock).toHaveBeenCalledTimes(1);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
  });

  it('额度触顶时返回 429 且不调用模型', async () => {
    budgetMock.mockResolvedValue({ allowed: false, used: 301, limit: 300, degraded: false });

    const response = await POST(
      post(JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })),
    );

    expect(response.status).toBe(429);
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});
