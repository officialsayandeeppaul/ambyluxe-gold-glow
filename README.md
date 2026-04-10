# Amby Luxe Jewels

Premium luxury jewelry e-commerce — [www.sayandeep.store](https://www.sayandeep.store).

## Quick start

```sh
npm install
cp .env.example .env   # Medusa URL + publishable key (see below)
npm run dev
```

Runs at [http://localhost:8080](http://localhost:8080).

**Backend:** Products, cart, and customer auth use [Medusa](https://medusajs.com/) in **[backend/](backend/)**. Start Docker (`docker compose up -d`), then follow [backend/README.md](backend/README.md). Set `VITE_MEDUSA_URL` and `VITE_MEDUSA_PUBLISHABLE_KEY` in the storefront `.env`. Without them, the storefront falls back to static demo products.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run check` | Lint + build |
| `npm test` | Run tests |

Full list: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** (some sections may still describe the old Supabase workflow.)

## Project structure

```
src/                 # App source (Vite + React)
backend/             # Medusa Store API + Admin (npm run dev → :9000)
docs/                # Developer docs
public/              # Static assets
```

## Tech stack

Vite · React · TypeScript · Tailwind · shadcn-ui · Medusa (Store API + customer auth)
