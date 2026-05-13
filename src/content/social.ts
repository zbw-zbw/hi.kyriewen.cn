import type { LucideIcon } from 'lucide-react';
import { Github, Twitter, Mail, Rss } from 'lucide-react';

export interface SocialLink {
  name: string;
  href: string;
  Icon: LucideIcon;
  handle?: string;
  /** 是否为邮箱（特殊处理：左键 mailto，右侧带 复制 按钮） */
  isEmail?: boolean;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'GitHub',
    href: 'https://github.com/zbw-zbw',
    Icon: Github,
    handle: '@zbw-zbw',
  },
  {
    name: 'Twitter / X',
    href: 'https://x.com/kyriewen',
    Icon: Twitter,
    handle: '@kyriewen',
  },
  {
    name: 'Email',
    href: 'mailto:support@kyriewen.cn',
    Icon: Mail,
    handle: 'support@kyriewen.cn',
    isEmail: true,
  },
  {
    name: 'RSS',
    href: '/rss.xml',
    Icon: Rss,
    handle: '/rss.xml',
  },
];
