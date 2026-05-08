import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';
import { Spotlight } from '@/components/spotlight';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CommandMenu } from '@/components/command-menu';
import { PersonJsonLd, WebSiteJsonLd } from '@/components/json-ld';
import { routing } from '@/i18n/routing';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t('name')} — ${t('tagline')}`,
      template: `%s — ${t('name')}`,
    },
    description: t('description'),
    authors: [{ name: 'Kyriewen', url: SITE_URL }],
    creator: 'Kyriewen',
    openGraph: {
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      url: SITE_URL,
      siteName: t('name'),
      title: `${t('name')} — ${t('tagline')}`,
      description: t('description'),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('name')} — ${t('tagline')}`,
      description: t('description'),
      creator: '@kyriewen',
    },
    alternates: {
      canonical: '/',
      languages: {
        en: '/',
        zh: '/zh',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="relative">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <Spotlight />
            <div className="relative z-10 flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
                {children}
              </main>
              <Footer />
            </div>
            <CommandMenu />
            <Toaster position="bottom-right" theme="system" />
          </NextIntlClientProvider>
        </ThemeProvider>
        <PersonJsonLd />
        <WebSiteJsonLd />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
