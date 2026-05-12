import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeAccentProvider, ThemeAccentScript } from '@/components/theme-accent-provider';
import { Spotlight } from '@/components/spotlight';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ScrollToTop } from '@/components/scroll-to-top';
import { AiChatBubble } from '@/components/ai-chat-bubble';
import { CommandMenu, type SearchablePost } from '@/components/command-menu';
import { PersonJsonLd, WebSiteJsonLd } from '@/components/json-ld';
import { getAllPosts } from '@/lib/blog';
import { getNavigationItems, getSocialLinks } from '@/lib/content-loader';
import { routing, type Locale } from '@/i18n/routing';

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

  // 服务端预加载导航 + 社交链接（传递给 Client Component）
  const [navItems, socialLinks] = await Promise.all([getNavigationItems(), getSocialLinks()]);

  // 服务端读取博客列表并投影成客户端可用的搜索条目（剥掉正文、只留元数据）
  const allPosts = await getAllPosts(locale as Locale);
  const searchablePosts: SearchablePost[] = allPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    tags: p.tags,
    date: p.date,
  }));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* 防主题闪烁：在 hydration 前同步设置 dark class */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch(e){}})()`,
          }}
        />
        {/* 防闪烁：在 hydration 前同步设置 data-accent 属性 */}
        <ThemeAccentScript />
      </head>
      <body className="relative">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeAccentProvider>
            <NextIntlClientProvider>
              <Spotlight />
              <div className="relative z-10 flex min-h-screen flex-col">
                <Header navItems={navItems} socialLinks={socialLinks} />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
                  {children}
                </main>
                <Footer socialLinks={socialLinks} />
              </div>
              <CommandMenu posts={searchablePosts} navItems={navItems} socialLinks={socialLinks} />
              <AiChatBubble />
              <ScrollToTop />
              <Toaster position="top-right" theme="system" />
            </NextIntlClientProvider>
          </ThemeAccentProvider>
        </ThemeProvider>
        <PersonJsonLd
          sameAs={socialLinks.filter((l) => l.href.startsWith('http')).map((l) => l.href)}
        />
        <WebSiteJsonLd />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
