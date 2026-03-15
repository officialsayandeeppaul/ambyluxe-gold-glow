# Development Guide

Quick reference for developers. All commands and checks in one place.

## Prerequisites

- **Node.js** 18+
- **npm** (comes with Node)
- **Supabase CLI** (optional, for migrations): `npm install -g supabase`

## Commands Cheatsheet

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (http://localhost:8080) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run db:push` | Push migrations to Supabase |
| `npm run db:status` | Check migration status |
| `npm run db:types` | Generate TypeScript types from DB |

## First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd ambyluxe-gold-glow
npm install

# 2. Copy env and add your keys
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# 3. Link Supabase (one-time, needs project ref + access token)
npx supabase link --project-ref wgtjsotmotpopmynkxis

# 4. Push database migrations
npm run db:push

# 5. Start dev
npm run dev
```

## Database Commands

```bash
# Push migrations to remote Supabase
npm run db:push

# Check which migrations are applied
npm run db:status

# Regenerate TypeScript types from schema (after schema changes)
npm run db:types
```

## Checks Before Deploy

```bash
npm run lint      # No errors
npm run build     # Build succeeds
npm run test      # Tests pass
```

## Project Structure

```
ambyluxe-gold-glow/
├── src/
│   ├── components/    # React components
│   ├── hooks/         # useAuth, etc.
│   ├── integrations/  # Supabase client, types
│   ├── lib/           # Utils, store
│   └── pages/         # Route pages
├── supabase/
│   ├── migrations/    # SQL migrations (run in order)
│   └── config.toml    # Supabase config
├── public/            # Static assets
├── docs/              # Documentation
└── dist/              # Build output (gitignored)
```
