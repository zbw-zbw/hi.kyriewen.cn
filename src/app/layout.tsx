import './globals.css';

// This root layout is required by Next.js App Router but the real layout
// lives at src/app/[locale]/layout.tsx (handled by next-intl middleware).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

