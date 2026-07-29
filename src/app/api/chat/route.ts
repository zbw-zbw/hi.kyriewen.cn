import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { clientIp, enforceRateLimit } from '@/lib/ratelimit';
import { consumeDailyBudget } from '@/lib/cost-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/chat');

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are Kyriewen's AI avatar — a helpful, friendly front-end developer and indie maker.

## About Kyriewen
- Name: Kyriewen (张宝文)
- Website: https://hi.kyriewen.cn (personal blog & portfolio)
- Domain: kyriewen.cn — the website is hi.kyriewen.cn, NOT kyriewen.com (that doesn't exist)
- Email: support@kyriewen.cn
- GitHub: https://github.com/kyriewen
- Role: Front-end developer & indie maker
- Tech stack: Next.js, React, TypeScript, Tailwind CSS, Vercel, Drizzle ORM, Neon PostgreSQL

## Rules
- Answer questions about Kyriewen's blog, projects, tech stack, and background.
- If asked for URLs, always use hi.kyriewen.cn as the domain, never kyriewen.com or any other.
- If a question is unrelated, politely decline and suggest visiting the blog.
- Keep answers concise (under 200 words). Use Markdown for formatting.
- Reply in the same language the user writes in.`;

/**
 * 根据环境变量自动选择 AI 提供商。
 */
function getModel() {
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? '';

  if (provider === 'deepseek') {
    const deepseek = createOpenAI({
      apiKey,
      baseURL: process.env.AI_BASE_URL ?? 'https://api.deepseek.com',
    });
    return deepseek.chat(process.env.AI_MODEL ?? 'deepseek-chat');
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL ?? undefined,
  });
  return openai.chat(process.env.AI_MODEL ?? 'gpt-4o-mini');
}

interface NormalizedMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 将前端发来的消息格式统一转成 { role, content } 数组。
 * TextStreamChatTransport 发的 parts 格式需要转成 content 字符串。
 */
function normalizeMessages(raw: unknown[]): NormalizedMessage[] {
  return raw
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null && 'role' in m)
    .map((m) => {
      const role = String(m.role) as 'user' | 'assistant';
      let content = '';

      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.parts)) {
        content = (m.parts as Array<Record<string, unknown>>)
          .filter((p) => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text as string)
          .join('');
      } else if (Array.isArray(m.content)) {
        content = (m.content as Array<Record<string, unknown>>)
          .filter((p) => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text as string)
          .join('');
      }

      return { role, content };
    })
    .filter((m) => m.content.length > 0);
}

export async function POST(request: Request) {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'AI Chat is not configured yet. Please set AI_API_KEY or OPENAI_API_KEY.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 限流：本端点无需登录，每次调用都在烧 LLM token，
  // 按 IP 限额是避免成本被外部任意放大的唯一手段。
  const limited = await enforceRateLimit('chat', clientIp(request));
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = normalizeMessages(rawMessages);
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 每日全站总量护栏：限流按 IP，拦不住分布式小流量刷账单。
  //
  // 注意顺序：必须在所有校验通过之后、真正调模型之前才扣。
  // 若提前到解析请求体之前，攻击者只需发频格式错误的请求就能耗尽当日额度而
  // 一次 LLM 都不调用 —— 护栏反而成为廉价的功能拒绝服务通道。
  const budget = await consumeDailyBudget('ai-chat');
  if (!budget.allowed) {
    return new Response(
      JSON.stringify({ error: 'AI chat has reached its daily limit. Please try again tomorrow.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const result = streamText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages,
      maxOutputTokens: 500,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    log.error('stream_failed', error);
    return new Response(
      JSON.stringify({
        error: 'AI service error. Please try again later.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
