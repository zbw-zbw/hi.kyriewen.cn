import { useTranslations } from 'next-intl';
import { Github, Twitter, Rss, Mail } from 'lucide-react';

const SOCIAL = [
  { href: 'https://github.com/zbw-zbw', label: 'GitHub', Icon: Github },
  { href: 'https://x.com/kyriewen', label: 'Twitter / X', Icon: Twitter },
  { href: '/rss.xml', label: 'RSS', Icon: Rss },
  { href: 'mailto:hi@kyriewen.cn', label: 'Email', Icon: Mail },
];

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[var(--border)] py-8 text-sm text-[var(--muted)]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="space-y-1 text-center sm:text-left">
          <p>{t('builtWith')}</p>
          <p>{t('copyright', { year })}</p>
        </div>
        <div className="flex items-center gap-4">
          {SOCIAL.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              aria-label={label}
              className="transition-colors hover:text-[var(--fg)]"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
