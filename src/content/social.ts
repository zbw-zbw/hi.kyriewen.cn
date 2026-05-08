import type { LucideIcon } from 'lucide-react';
import { Github, Twitter, Mail, Rss, Globe } from 'lucide-react';

export interface SocialLink {
  name: string;
  href: string;
  Icon: LucideIcon;
  handle?: string;
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
    href: 'mailto:hi@kyriewen.cn',
    Icon: Mail,
    handle: 'hi@kyriewen.cn',
  },
  {
    name: 'Old Blog',
    href: 'https://blog.zbw-zbw.cn',
    Icon: Globe,
    handle: 'blog.zbw-zbw.cn',
  },
  {
    name: 'RSS',
    href: '/rss.xml',
    Icon: Rss,
    handle: '/rss.xml',
  },
];
