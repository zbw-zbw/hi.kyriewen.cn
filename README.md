# hi.kyriewen.cn

> Personal website of **Kyriewen** — Indie hacker · Frontend developer · Chrome extension builder.

Built with Next.js 15/16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + next-intl.

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
| `pnpm db:generate` | Generate Drizzle migration from schema |
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:studio` | Open Drizzle Studio |

## 🔐 Required Env Vars for Production

Copy `.env.example` → `.env.local` and fill:

- `POSTGRES_URL` — Vercel Postgres (guestbook, stats dashboard)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — Guestbook login (GitHub OAuth app)
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `GITHUB_TOKEN` — For rate-limit-safe GitHub API
- `BUTTONDOWN_API_KEY` — Newsletter provider
- `CRON_SECRET` — Protect `/api/cron/*` endpoints
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Guestbook rate limiting

All secrets are optional locally — the app degrades gracefully (e.g. stats page shows an empty state, newsletter accepts but doesn't persist).

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
