# hi.kyriewen.cn

> Personal website of **Kyriewen** — Indie hacker · Frontend developer · Chrome extension builder.

Built with Next.js 15/16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + next-intl.

## ✨ Features

- 🚀 **Product Matrix** — Showcase of all my Chrome extensions and web apps
- ✍️ **Blog** — Technical writing in MDX (bilingual: EN / 中文)
- 📅 **Now Page** — What I'm currently building, listening to, reading
- 📊 **Stats Dashboard** — Build-in-public data (GitHub stars, Chrome users, MRR)
- 📮 **Newsletter** — Subscribe via Resend
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
| Newsletter | Resend |
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
- `RESEND_API_KEY` — Newsletter provider (Resend)
- `RESEND_AUDIENCE_ID` — Resend audience ID for subscribers
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

## 🗺️ Roadmap

### Phase 2 — Admin Dashboard (Planned)

Currently ~40 pieces of content data are hardcoded in 7 files under `src/content/`:

| File | Data | Count |
| --- | --- | --- |
| `projects.ts` | Product showcase | 6 projects |
| `now.ts` | Now page items | 3 items |
| `photos.ts` | Photo gallery | 6 photos |
| `timeline.ts` | Timeline events | 8 events |
| `uses.ts` | Hardware/software/services | 12 items |
| `popular.ts` | Popular posts | 1 post |
| `social.ts` | Social links | 4 links |

**Plan**: Build a separate admin dashboard (to keep the open-source main site clean) that provides:
- CRUD for all content types above
- API-driven content management (move from hardcoded `.ts` files to database)
- Image upload and management
- Blog post editor (MDX)
- Newsletter subscriber management (via Resend API)
- Analytics overview

This ensures the main site remains open-source and clean, while the admin system handles all content operations.

## 📝 License

MIT © Kyriewen
