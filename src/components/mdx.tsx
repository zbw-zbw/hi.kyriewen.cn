import { MDXRemote, compileMDX, type MDXRemoteProps } from 'next-mdx-remote/rsc';
import { createHighlighter } from 'shiki';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// 单例 highlighter —— 避免每篇文章重新初始化
let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'typescript',
        'tsx',
        'javascript',
        'jsx',
        'json',
        'bash',
        'shell',
        'css',
        'html',
        'markdown',
        'mdx',
      ],
    });
  }
  return highlighterPromise;
}

function Pre({ className, ...props }: ComponentProps<'pre'>) {
  return (
    <pre
      className={cn(
        'my-5 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

function InlineCode({ className, ...props }: ComponentProps<'code'>) {
  return (
    <code
      className={cn('rounded bg-[var(--card)] px-1.5 py-0.5 font-mono text-[0.85em]', className)}
      {...props}
    />
  );
}

function Anchor({ className, href, ...props }: ComponentProps<'a'>) {
  const isExternal = href?.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={cn('text-[var(--accent)] underline-offset-4 hover:underline', className)}
      {...props}
    />
  );
}

const components = {
  pre: Pre,
  code: InlineCode,
  a: Anchor,
};

/**
 * 转义 MDX 中可能导致解析失败的特殊字符。
 * 从外部来源（如掘金同步）的 Markdown 内容可能包含裸花括号、
 * 尖括号等被 MDX 当作 JSX 表达式解析的字符。
 */
function escapeMdxSpecialChars(source: string): string {
  // 保护代码块内容不被转义
  const codeBlocks: string[] = [];
  let escaped = source.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 转义代码块外的裸花括号（非代码块中的 { 和 }）
  escaped = escaped.replace(/(?<![\\])\{(?![{%])/g, '\\{');
  escaped = escaped.replace(/(?<![\\])\}(?![}%])/g, '\\}');

  // 转义 < 开头的非标准 HTML 标签（避免被当作 JSX 组件解析）
  escaped = escaped.replace(/<(?![/a-z!]|$)/gi, '&lt;');

  // 恢复代码块
  escaped = escaped.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => codeBlocks[Number(index)]!);

  return escaped;
}

/**
 * 预编译 MDX 内容以检测是否可以正常解析。
 * 返回 true 表示可以正常解析，返回 false 表示需要转义。
 */
async function canCompileMdx(source: string, options: MDXRemoteProps['options']): Promise<boolean> {
  try {
    await compileMDX({ source, options });
    return true;
  } catch {
    return false;
  }
}

export async function Mdx({ source }: { source: string }) {
  const highlighter = await getHighlighter();
  const [rehypeShikiMod, rehypeSlugMod, rehypeAutolinkMod] = await Promise.all([
    import('@shikijs/rehype'),
    import('rehype-slug'),
    import('rehype-autolink-headings'),
  ]);

  const options: MDXRemoteProps['options'] = {
    mdxOptions: {
      rehypePlugins: [
        rehypeSlugMod.default,
        [
          rehypeAutolinkMod.default,
          {
            behavior: 'wrap',
            properties: {
              className: ['heading-anchor'],
            },
          },
        ],
        [
          rehypeShikiMod.default,
          {
            themes: { light: 'github-light', dark: 'github-dark' },
            langs: [
              'typescript',
              'tsx',
              'javascript',
              'jsx',
              'json',
              'bash',
              'shell',
              'css',
              'html',
              'markdown',
              'mdx',
              'yaml',
              'python',
              'go',
              'rust',
              'sql',
              'diff',
              'plaintext',
            ],
            getHighlighter: () => Promise.resolve(highlighter),
          },
        ],
      ],
    },
  };

  // 预编译检测：如果原始内容能通过编译则直接渲染
  const canRenderOriginal = await canCompileMdx(source, options);
  if (canRenderOriginal) {
    return <MDXRemote source={source} components={components} options={options} />;
  }

  // 原始内容编译失败时转义特殊字符后重试
  const escapedSource = escapeMdxSpecialChars(source);
  const canRenderEscaped = await canCompileMdx(escapedSource, options);
  if (canRenderEscaped) {
    return <MDXRemote source={escapedSource} components={components} options={options} />;
  }

  // 两次都失败时，降级为纯文本 HTML 渲染
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        ⚠️ 本文内容包含无法解析的特殊格式，已降级为纯文本显示。
      </p>
      {source}
    </div>
  );
}
