# Amby Luxe Jewels

Premium luxury jewelry e-commerce — [www.sayandeep.store](https://www.sayandeep.store).

## Quick start

```sh
npm install
cp .env.example .env   # Add your Supabase keys
npm run dev
```

Runs at [http://localhost:8080](http://localhost:8080).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push database migrations |
| `npm run db:status` | Check migration status |
| `npm run check` | Lint + build |

Full list: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**

## Project structure

```
src/           # App source
supabase/      # DB migrations, config
docs/          # Developer docs
public/        # Static assets
```

## Tech stack

Vite · React · TypeScript · Tailwind · shadcn-ui · Supabase
