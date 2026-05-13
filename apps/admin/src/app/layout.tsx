import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme-provider';
import { LocaleProvider } from '@/components/locale-provider';

export const metadata: Metadata = {
  title: 'Admin — hi.kyriewen.cn',
  description: 'Content management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
