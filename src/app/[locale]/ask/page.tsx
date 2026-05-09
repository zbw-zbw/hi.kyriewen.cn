'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, type UIMessage } from 'ai';
import { useLocale, useTranslations } from 'next-intl';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 延迟加载 renderSafeMarkdown（仅客户端），
 * 避免 isomorphic-dompurify 在 SSG/build 阶段被 bundler 静态分析到。
 */
let _renderFn: ((raw: string) => string) | null = null;
async function lazyRenderMarkdown(raw: string): Promise<string> {
  if (!_renderFn) {
    const mod = await import('@/lib/markdown');
    _renderFn = mod.renderSafeMarkdown;
  }
  return _renderFn(raw);
}

/** 从 UIMessage 中提取纯文本内容 */
function getMessageText(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** 异步渲染 markdown 的气泡组件 */
function MarkdownBubble({ text }: { text: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let cancelled = false;
    lazyRenderMarkdown(text).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [text]);

  if (!html) return <p>{text}</p>;
  return (
    <div
      className="prose-kw [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function AskPage() {
  const locale = useLocale();
  const isZh = locale === 'zh';
  const t = useTranslations('ask');

  const [input, setInput] = useState('');
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' }),
    onError: (err: Error) => {
      if (err.message?.includes('503') || err.message?.includes('not configured')) {
        setApiUnavailable(true);
      }
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage({ text });
    inputRef.current?.focus();
  };

  // 尚未配置 API key —— 显示 Coming Soon
  if (apiUnavailable) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-full bg-[var(--card)] p-4">
          <Sparkles className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{t('comingSoon')}</h1>
          <p className="max-w-sm text-sm text-[var(--muted-fg)]">
            {t('comingSoonDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      {/* 头部 */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-fg)]">
            Beta
          </span>
        </div>
        <p className="text-sm text-[var(--muted-fg)]">{t('subtitle')}</p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Bot className="h-12 w-12 text-[var(--border)]" />
            <p className="max-w-xs text-sm text-[var(--muted)]">
              {t('emptyHint')}
            </p>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'user'
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-[var(--card)] text-[var(--muted)]'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-[var(--card)] text-[var(--card-fg)]'
                )}
              >
                {message.role === 'assistant' ? (
                  <MarkdownBubble text={text} />
                ) : (
                  <p>{text}</p>
                )}
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('thinking')}</span>
          </div>
        )}

        {error && !apiUnavailable && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{t('error')}</span>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <form
        onSubmit={handleSubmit}
        className="mt-auto flex items-center gap-2 border-t border-[var(--border)] pt-4"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          disabled={isStreaming}
          maxLength={500}
          autoFocus
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={isZh ? '发送' : 'Send'}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
