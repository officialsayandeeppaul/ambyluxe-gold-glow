# Medusa backend (Amby Luxe)

Store API on **http://localhost:9000**, Admin UI at **http://localhost:9000/app**.

## Prerequisites

- Node 20+
- Docker Desktop (for PostgreSQL + Redis)

## One-time setup

From the **repository root**:

```sh
docker compose up -d
cd backend
npm install
cp .env.template .env
npx medusa db:migrate
npm run seed
```

Create an admin user (for Medusa Admin login):

```sh
npx medusa user -e your@email.com -p your-secure-password
```

**Publishable API key** for the Vite storefront: after seed, open Medusa Admin → **Settings → Publishable API keys**, or read the `token` from the `api_key` table where `type = 'publishable'`.

Put in the storefront `.env`:

```env
VITE_MEDUSA_URL=http://localhost:9000
VITE_MEDUSA_PUBLISHABLE_KEY=pk_...
```

## Promotions (coupons & deals) — admin-friendly guide

Non-technical staff: see **[docs/PROMOTIONS-ADMIN-GUIDE.md](./docs/PROMOTIONS-ADMIN-GUIDE.md)** for simple explanations of each promotion type, what **buy rules** vs **target rules** mean, and how to avoid common mistakes (especially **Buy X Get Y**). It also lists the **AMB_DEMO_*** example codes and how to reset them (`npm run seed:promotions`).

## Campaigns + promotions (how they connect)

For a complete explanation of what the **Campaigns** screen does, when to use campaign budgets, and how campaigns link with checkout discounts, see **[docs/CAMPAIGNS-PROMOTIONS-GUIDE.md](./docs/CAMPAIGNS-PROMOTIONS-GUIDE.md)**.

## Port 5433 for Postgres

If you have a **local PostgreSQL on 5432**, this project maps Docker Postgres to **5433** so it does not clash. `DATABASE_URL` in `.env` / `.env.template` uses `127.0.0.1:5433`.

## Run

```sh
cd backend
npm run dev
```

## Redis

`REDIS_URL` in `.env` should point at the Docker Redis service (`redis://127.0.0.1:6379`). If the CLI warns about Redis, ensure Docker Redis is running and the variable is present.

## Google and phone auth

- **Google:** supported. Add `MEDUSA_GOOGLE_CLIENT_ID`, `MEDUSA_GOOGLE_CLIENT_SECRET`, and `MEDUSA_GOOGLE_CALLBACK_URL` to `backend/.env`, then restart backend.
- Google callback URL for local dev storefront flow is `http://localhost:8080/auth/callback`.
- In storefront `.env`, set `VITE_MEDUSA_AUTH_GOOGLE_PROVIDER=google` so the Google button is shown.
- **Phone OTP (Twilio Verify):** supported via custom provider in `src/providers/twilio-phone`.
- Add to `backend/.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, and optional `MEDUSA_PHONE_PROVIDER_ID=phone`.
- In storefront `.env`, set `VITE_MEDUSA_AUTH_PHONE_PROVIDER=phone` (or your provider id).
- Flow: first submit phone number (OTP is sent), then submit OTP to authenticate/create customer identity.
