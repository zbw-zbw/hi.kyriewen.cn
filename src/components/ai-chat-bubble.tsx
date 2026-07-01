'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, type UIMessage } from 'ai';
import { useTranslations } from 'next-intl';
import { Send, Bot, User, Loader2, X, AlertCircle, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function getMessageText(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

let _renderFn: ((raw: string) => string) | null = null;
async function lazyRenderMarkdown(raw: string): Promise<string> {
  if (!_renderFn) {
    const mod = await import('@/lib/markdown');
    _renderFn = mod.renderSafeMarkdown;
  }
  return _renderFn(raw);
}

function MarkdownBubble({ text }: { text: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let cancelled = false;
    lazyRenderMarkdown(text).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!html) return <p className="whitespace-pre-wrap">{text}</p>;
  return (
    <div
      className="prose-kw text-sm [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function AiChatBubble() {
  const t = useTranslations('ask');

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' }),
    onError: (err: Error) => {
      const msg = err.message?.toLowerCase() ?? '';
      if (
        msg.includes('503') ||
        msg.includes('not configured') ||
        msg.includes('service unavailable')
      ) {
        setApiUnavailable(true);
      } else {
        setErrorMessage(t('sendFailed'));
      }
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // 当 error 发生变化时，尝试判断是否为 API 不可用
  useEffect(() => {
    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (
        msg.includes('503') ||
        msg.includes('not configured') ||
        msg.includes('service unavailable')
      ) {
        setApiUnavailable(true);
      }
    }
  }, [error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 移动端键盘弹起适配：监听 visualViewport 变化，动态调整面板底部偏移
  useEffect(() => {
    if (!isOpen) {
      setKeyboardOffset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // 键盘弹出时 visualViewport.height < window.innerHeight
      const diff = window.innerHeight - vv.height;
      setKeyboardOffset(diff > 50 ? diff : 0);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [isOpen]);

  // 清除错误提示
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isStreaming) return;
      setInput('');
      setErrorMessage('');
      try {
        await sendMessage({ text });
      } catch {
        setErrorMessage(t('sendFailed'));
      }
    },
    [input, isStreaming, sendMessage, t],
  );

  return (
    <>
      {/* 悬浮按钮 — 始终显示 MessageCircle 图标（关闭在面板右上角） */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'fixed right-6 bottom-24 z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-300 sm:right-8',
          'bg-[var(--accent)] text-[var(--accent-fg)] hover:scale-105 hover:shadow-xl',
        )}
        aria-label={t('openAssistant')}
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* 聊天面板 */}
      {isOpen && (
        <div
          ref={panelRef}
          style={keyboardOffset > 0 ? { bottom: `${keyboardOffset + 16}px` } : undefined}
          className={cn(
            'fixed right-6 z-50 flex w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:right-8 sm:w-[min(380px,calc(100vw-4rem))]',
            keyboardOffset > 0 ? 'h-[min(360px,50dvh)]' : 'bottom-[8rem] h-[min(480px,60dvh)]',
          )}
        >
          {/* 头部 */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <Bot className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-sm font-semibold">{t('title')}</span>
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent-fg)]">
              Beta
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--fg)]"
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 消息区 */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {apiUnavailable ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <Sparkles className="h-8 w-8 text-[var(--accent)]" />
                <p className="text-sm font-medium">{t('comingSoon')}</p>
                <p className="max-w-[240px] text-xs text-[var(--muted)]">{t('comingSoonDesc')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <Bot className="h-10 w-10 text-[var(--border)]" />
                <p className="max-w-[240px] text-xs text-[var(--muted)]">{t('emptyHint')}</p>
              </div>
            ) : (
              messages.map((message) => {
                const text = getMessageText(message);
                const isEmpty = message.role === 'assistant' && !text.trim();
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        message.role === 'user'
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--card)] text-[var(--muted)]',
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                          : 'bg-[var(--card)] text-[var(--card-fg)]',
                      )}
                    >
                      {isEmpty ? (
                        <p className="text-[var(--muted)] italic">{t('replyFailed')}</p>
                      ) : message.role === 'assistant' ? (
                        <MarkdownBubble text={text} />
                      ) : (
                        <p>{text}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isStreaming &&
              (() => {
                const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                const hasText = lastAssistant && getMessageText(lastAssistant).trim();
                return !hasText;
              })() && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t('thinking')}</span>
                </div>
              )}
            <div ref={messagesEndRef} />
          </div>

          {/* 错误提示条 */}
          {errorMessage && (
            <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 输入区 */}
          {!apiUnavailable && (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-2.5"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('placeholder')}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                disabled={isStreaming}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t('send')}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
