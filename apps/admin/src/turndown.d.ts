declare module 'turndown' {
  interface Options {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
  }

  interface Rule {
    filter: string | string[] | ((node: HTMLElement) => boolean);
    replacement: (content: string, node: HTMLElement) => string;
  }

  class TurndownService {
    constructor(options?: Options);
    turndown(html: string): string;
    addRule(key: string, rule: Rule): this;
    remove(filter: string | string[] | ((node: HTMLElement) => boolean)): this;
  }

  export default TurndownService;
}
