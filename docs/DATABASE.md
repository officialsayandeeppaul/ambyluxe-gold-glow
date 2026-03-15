# Database Guide

**Code-first schema.** Define models in TypeScript, generate SQL. No manual .sql files.

## Source of Truth

| File | Purpose |
|------|---------|
| **src/db/models/** | One file per table/enum – profile, user-role, wishlist, cart, order, enums |
| **src/db/schema.ts** | Re-exports all models (barrel) |
| **src/db/extras.ts** | RLS policies, triggers (Supabase-specific) |

## Commands

```bash
npm run db:generate   # Generate migrations from schema.ts
npm run db:push       # Apply to Supabase
npm run db:status     # Check migration status
npm run db:types      # Regenerate TypeScript types
```

## Flow

1. Edit **src/db/schema.ts** – add or change tables/columns
2. Run **npm run db:generate** – generates SQL (drizzle/ → supabase/migrations/)
3. Run **npm run db:push** – applies to Supabase

## Folder Structure

```
src/db/
├── models/
│   ├── index.ts    # Barrel export
│   ├── enums.ts    # app_role enum
│   ├── profile.ts  # profiles table
│   ├── user-role.ts
│   ├── wishlist.ts
│   ├── cart.ts
│   └── order.ts
├── schema.ts       # Re-exports models
└── extras.ts       # RLS, triggers
drizzle/            # Drizzle output (generated)
supabase/migrations/
```

## Schema Overview

- **profiles** – User profiles (name, phone, avatar). Created by trigger on signup.
- **user_roles** – Roles (admin, customer).
- **wishlists**, **carts**, **orders** – E‑commerce data.
