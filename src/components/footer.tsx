'use client';

import { useTranslations } from 'next-intl';
import { Github, Twitter, Mail, Rss } from 'lucide-react';
import { EmailLink } from '@/components/email-link';
import type { SerializableSocialLink } from '@/lib/content-loader';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Github,
  Twitter,
  Mail,
  Rss,
};

export function Footer({ socialLinks }: { socialLinks: SerializableSocialLink[] }) {
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
            {socialLinks
              .filter((link) => !link.isEmail)
              .map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={link.name}
                  title={link.name}
                  className="cursor-pointer transition-colors hover:text-[var(--fg)]"
                >
                  {(() => {
                    const Icon = ICON_MAP[link.iconName] ?? Mail;
                    return <Icon className="h-4 w-4" />;
                  })()}
                </a>
              ))}
            <EmailLink variant="pill" />
          </div>
        </div>
      </div>
    </footer>
  );
}
