'use client';

import { useTranslations } from 'next-intl';
import { Github, Twitter, Rss } from 'lucide-react';
import { EmailLink } from '@/components/email-link';

const SOCIAL = [
  { href: 'https://github.com/zbw-zbw', label: 'GitHub', Icon: Github },
  { href: 'https://x.com/kyriewen', label: 'Twitter / X', Icon: Twitter },
  { href: '/rss.xml', label: 'RSS', Icon: Rss },
];

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--border)] py-8 text-sm text-[var(--muted)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="space-y-1 text-center sm:text-left">
            <p>{t('builtWith')}</p>
            <p>{t('copyright', { year })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {SOCIAL.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={label}
                title={label}
                className="cursor-pointer transition-colors hover:text-[var(--fg)]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
            <EmailLink variant="pill" />
          </div>
        </div>
      </div>
    </footer>
  );
}
