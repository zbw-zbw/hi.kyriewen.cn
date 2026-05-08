import { MDXRemote, type MDXRemoteProps } from 'next-mdx-remote/rsc';
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
        className
      )}
      {...props}
    />
  );
}

function InlineCode({ className, ...props }: ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded bg-[var(--card)] px-1.5 py-0.5 font-mono text-[0.85em]',
        className
      )}
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
      className={cn(
        'text-[var(--accent)] underline-offset-4 hover:underline',
        className
      )}
      {...props}
    />
  );
}

const components = {
  pre: Pre,
  code: InlineCode,
  a: Anchor,
};

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
            ],
            getHighlighter: () => Promise.resolve(highlighter),
          },
        ],
      ],
    },
  };

  return <MDXRemote source={source} components={components} options={options} />;
}
