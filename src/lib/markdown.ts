import { Marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import GithubSlugger from 'github-slugger';

/**
 * 安全的轻量 Markdown 渲染器，专用于用户生成内容（留言/评论）。
 *
 * 安全策略：
 * 1. marked 渲染 → DOMPurify sanitize 双层防御
 * 2. 白名单标签：仅放行段落、强调、代码、引用、列表、链接、换行
 * 3. 链接强制 rel="noopener noreferrer nofollow ugc" + target="_blank"
 * 4. 禁用 HTML 透传（marked 默认就 escape）
 *
 * 性能：
 * - 服务端调用：渲染后存到 React 树里，零客户端 JS 开销
 * - 单条留言渲染 < 1ms
 */

// 创建独立实例，避免全局副作用（Serverless 模块缓存场景下线程安全）
const md = new Marked({
  gfm: true,
  breaks: true,
});

const ALLOWED_TAGS = [
  'p',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'br',
  'del',
  'hr',
  'h3',
  'h4',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

/**
 * 渲染 Markdown 文本为安全 HTML 字符串。
 * 用法：<div dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(body) }} />
 */
export function renderSafeMarkdown(raw: string): string {
  if (!raw) return '';
  const html = md.parse(raw, { async: false }) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 阻止 javascript: data: 等危险协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  // 后处理：所有外链强制 noopener + nofollow
  return sanitized.replace(
    /<a\s+([^>]*?)href="(https?:[^"]+)"([^>]*)>/g,
    '<a $1href="$2"$3 target="_blank" rel="noopener noreferrer nofollow ugc">',
  );
}

/**
 * 提取纯文本（用于通知摘要、SEO meta 等）。
 */
export function stripMarkdown(raw: string): string {
  return raw
    .replace(/[*_`~#>-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── 正文级渲染器 ────────────────────────────────── */

/**
 * 正文白名单：比留言宽松（允许标题、图片、表格），但仍不允许
 * script / style / iframe / 事件属性等任何可执行内容。
 */
const ARTICLE_ALLOWED_TAGS = [
  'p',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'br',
  'del',
  'hr',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'span',
];

const ARTICLE_ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'colspan',
  'rowspan',
  'id',
  'loading',
];

/**
 * 渲染【不可信来源】的文章正文为安全 HTML。
 *
 * 适用于数据库里的 blog_posts.content：这些内容来自后台写入或第三方平台
 * 同步（掘金等），不能走 MDX —— MDX 会在服务端求值 `{...}` 表达式，
 * 等于把数据当代码执行。只有 src/content/blog/ 下经 git review 的文件才走 MDX。
 */
export function renderArticleMarkdown(raw: string): string {
  if (!raw) return '';
  const html = md.parse(raw, { async: false }) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ARTICLE_ALLOWED_TAGS,
    ALLOWED_ATTR: ARTICLE_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  // 每次渲染用新的 slugger，与 extractToc 的去重计数保持一致
  const headingSlugger = new GithubSlugger();

  return (
    sanitized
      // 外链强制 noopener + nofollow
      .replace(
        /<a\s+([^>]*?)href="(https?:[^"]+)"([^>]*)>/g,
        '<a $1href="$2"$3 target="_blank" rel="noopener noreferrer nofollow ugc">',
      )
      // 图片延迟加载
      .replace(/<img\s+/g, '<img loading="lazy" ')
      // 给 h2/h3 补上锚点 id，与 extractToc 的 github-slugger 保持一致
      .replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (_full, tag: string, inner: string) => {
        const text = inner.replace(/<[^>]+>/g, '').trim();
        return `<${tag} id="${headingSlugger.slug(text)}">${inner}</${tag}>`;
      })
  );
}
