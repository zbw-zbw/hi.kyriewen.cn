# kyriewen.cn

> Personal website of **Kyriewen** — Indie hacker · Frontend developer · Chrome extension builder.

Built with Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4.

## ✨ Features

- 🚀 **Product Matrix** — Showcase of all my Chrome extensions and web apps
- ✍️ **Blog** — Technical writing in MDX (bilingual: EN / 中文)
- 📅 **Now Page** — What I'm currently building, listening to, reading
- 📊 **Stats Dashboard** — Build-in-public data (GitHub stars, Chrome users, MRR)
- 📮 **Newsletter** — Subscribe via Buttondown
- 💬 **Guestbook** — Sign in with GitHub and leave a message
- 🕒 **Timeline** — Personal & product milestones (levels.io style)
- ⚙️ **Uses** — My current hardware / software / dev stack

## 🧰 Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + CSS Variables |
| UI | shadcn/ui · cmdk · framer-motion |
| Theme | next-themes (light / dark) |
| i18n | next-intl (en / zh) |
| Database | Vercel Postgres + Drizzle ORM |
| Auth | NextAuth (GitHub OAuth) |
| Newsletter | Buttondown |
| Analytics | Vercel Analytics + Umami (self-hosted) |
| Deploy | Vercel + Cloudflare DNS |

## 🚀 Getting Started

```bash
pnpm install
cp .env.example .env.local   # fill in your secrets
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📦 Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | TypeScript check |
| `pnpm format` | Format with Prettier |

## 📁 Project Structure

```
src/
├── app/[locale]/        # i18n routes
│   ├── page.tsx         # Home
│   ├── projects/        # Product matrix
│   ├── blog/            # MDX blog
│   ├── now/             # Now page
│   ├── stats/           # Build-in-public dashboard
│   ├── timeline/        # Personal timeline
│   ├── uses/            # Uses page
│   └── guestbook/       # Guestbook
├── components/          # Shared components
├── content/             # Static content (projects, timeline, uses)
├── lib/                 # Utilities (db, i18n, helpers)
├── messages/            # i18n messages (en.json, zh.json)
└── styles/              # Global CSS
```

## 📝 License

MIT © Kyriewen
