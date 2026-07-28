import { describe, expect, it } from 'vitest';
import { renderArticleMarkdown, renderSafeMarkdown } from '@/lib/markdown';
import { extractToc } from '@/lib/blog';

/**
 * 这些用例锁定的是「数据库正文不可信」这条不变式。
 *
 * 数据库里的 blog_posts.content 来自后台写入或第三方平台同步，
 * 曾经直接进 MDX 编译 —— 而 MDX 会在服务端求值 `{...}` 表达式，
 * 等于把数据当代码执行。渲染器换成 sanitize 后，下面每条都必须成立。
 */

describe('renderArticleMarkdown — 不可信正文渲染', () => {
  it('MDX 表达式必须按字面量输出，绝不求值', () => {
    const html = renderArticleMarkdown('泄露测试：{process.env.POSTGRES_URL}');

    // 关键断言：花括号原样保留，说明没有被当作表达式执行
    expect(html).toContain('{process.env.POSTGRES_URL}');
    // 不能出现真实连接串的任何特征
    expect(html).not.toContain('postgres://');
    expect(html).not.toContain('postgresql://');
  });

  it('MDX 立即执行函数不会被执行', () => {
    const html = renderArticleMarkdown('{(() => 6 * 7)()}');
    expect(html).toContain('6 * 7');
    expect(html).not.toContain('42');
  });

  it('剥离 script 标签', () => {
    const html = renderArticleMarkdown('正文<script>alert(1)</script>结束');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)</script>');
  });

  it('剥离 iframe / object / embed', () => {
    for (const tag of ['iframe', 'object', 'embed']) {
      const html = renderArticleMarkdown(`<${tag} src="https://evil.example"></${tag}>`);
      expect(html).not.toContain(`<${tag}`);
    }
  });

  it('剥离内联事件处理器', () => {
    const html = renderArticleMarkdown('<img src="x.png" onerror="alert(1)">');
    expect(html.toLowerCase()).not.toContain('onerror');
  });

  it('不会生成 javascript: 协议的链接', () => {
    const html = renderArticleMarkdown('[点我](javascript:alert(1))');
    // 真正危险的是可点击的 href；文本里出现 "javascript:" 字样无害
    expect(html).not.toMatch(/href\s*=\s*["']?javascript:/i);
  });

  it('不会生成 data: 协议的链接', () => {
    const html = renderArticleMarkdown('[x](data:text/html;base64,PHNjcmlwdD4x)');
    expect(html).not.toMatch(/href\s*=\s*["']?data:/i);
  });

  it('允许正常的标题、表格、图片与链接', () => {
    const html = renderArticleMarkdown(
      [
        '## 小节',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '![图](https://cdn.example/a.png)',
      ].join('\n'),
    );
    expect(html).toContain('<h2');
    expect(html).toContain('<table>');
    expect(html).toContain('<img');
    expect(html).toContain('loading="lazy"');
  });

  it('外链强制 noopener / nofollow', () => {
    const html = renderArticleMarkdown('[站外](https://evil.example)');
    expect(html).toContain('rel="noopener noreferrer nofollow ugc"');
    expect(html).toContain('target="_blank"');
  });

  it('空输入返回空串，不抛异常', () => {
    expect(renderArticleMarkdown('')).toBe('');
  });
});

describe('标题锚点与 TOC 必须对齐', () => {
  // TOC 是右侧目录，锚点 id 不一致会导致点击跳不动
  const source = ['## 安装步骤', '内容', '### 环境要求', '内容', '## 安装步骤', '重复标题'].join(
    '\n',
  );

  it('renderArticleMarkdown 产出的 id 与 extractToc 的 slug 一一对应', () => {
    const html = renderArticleMarkdown(source);
    const toc = extractToc(source);

    expect(toc.length).toBeGreaterThan(0);
    for (const entry of toc) {
      expect(html).toContain(`id="${entry.id}"`);
    }
  });

  it('重复标题的去重后缀两侧一致', () => {
    const toc = extractToc(source);
    const ids = toc.map((e) => e.id);
    // github-slugger 对重复项追加 -1
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('安装步骤-1');
  });
});

describe('renderSafeMarkdown — 用户留言渲染', () => {
  it('不放行标题与图片（留言白名单更严格）', () => {
    const html = renderSafeMarkdown('## 标题\n\n![x](https://cdn.example/a.png)');
    expect(html).not.toContain('<h2');
    expect(html).not.toContain('<img');
  });

  it('剥离 script 标签，且不生成 javascript: 链接', () => {
    const html = renderSafeMarkdown('<script>alert(1)</script>[x](javascript:alert(1))');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/href\s*=\s*["']?javascript:/i);
  });

  it('保留基础排版标签', () => {
    const html = renderSafeMarkdown('**粗体** 和 `代码`');
    expect(html).toContain('<strong>');
    expect(html).toContain('<code>');
  });
});
