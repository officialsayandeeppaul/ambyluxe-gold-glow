# Production copy-paste (frontend: www.sayandeep.store)

Canonical storefront URL: **`https://www.sayandeep.store`**

Replace `pk_YOUR_PRODUCTION_KEY` with the token from Medusa Admin → **Settings → Publishable API keys**.

---

## Vercel → Settings → Environment Variables (Production)

Add each row (name = left, value = right). **Redeploy after saving** — `VITE_*` values are baked in at build time.

**Required for store + admin link:**

```env
VITE_MEDUSA_URL=https://amby-backend-api.sayandeep.store
VITE_MEDUSA_PUBLISHABLE_KEY=pk_YOUR_PRODUCTION_KEY
VITE_MEDUSA_DEFAULT_CURRENCY=inr
VITE_MEDUSA_ADMIN_URL=https://amby-backend-api.sayandeep.store/app
```

**Required for “Continue with Google” and mobile OTP UI** (without these, the auth page stays email/password only):

```env
VITE_MEDUSA_AUTH_GOOGLE_PROVIDER=google
VITE_MEDUSA_AUTH_PHONE_PROVIDER=phone
```

Optional:

```env
VITE_STORE_ADMIN_EMAILS=your@email.com
VITE_RAZORPAY_KEY_ID=rzp_live_OR_your_test_key
VITE_WHATSAPP_NUMBER=91XXXXXXXXXX
VITE_WHATSAPP_MESSAGE=Hi Amby Luxe, I need help with my order.
```

---

## Railway → Medusa service → Variables

Use **comma-separated** origins, **no spaces** after commas (unless your backend trims them).

```env
STORE_CORS=https://www.sayandeep.store,https://sayandeep.store
AUTH_CORS=https://www.sayandeep.store,https://sayandeep.store
ADMIN_CORS=https://www.sayandeep.store,https://sayandeep.store
STORE_PUBLIC_URL=https://www.sayandeep.store
MEDUSA_GOOGLE_CALLBACK_URL=https://www.sayandeep.store/auth/callback
```

**Product & collection image URLs in Admin** (seeded `http://localhost:8080/...`):

- **`STORE_PUBLIC_URL`** is also used when building image URLs in **`npm run seed`** / **`ensure:collections`** (via `getStorefrontImageBase()` in code). Set it **before** a fresh seed on Railway.
- For data already in the DB with localhost URLs, run once (after deploy), from **`backend/`** with Railway env loaded or via **`railway ssh`** → `cd /app/.medusa/server`:

  ```bash
  # Ensure STORE_PUBLIC_URL=https://www.sayandeep.store on the service, then:
  cd /app && node ./scripts/medusa-exec-server.cjs src/scripts/backfill-seed-storefront-urls.js
  ```

  Or locally: `npm run backfill:seed-storefront-urls` with `STORE_PUBLIC_URL` set.

Optional override: **`SEED_STOREFRONT_BASE_URL`** (same value as storefront origin) if you want image base different from `STORE_PUBLIC_URL`.

If you **only** ever use `www`, you can shorten to a single origin:

```env
STORE_CORS=https://www.sayandeep.store
AUTH_CORS=https://www.sayandeep.store
ADMIN_CORS=https://www.sayandeep.store
STORE_PUBLIC_URL=https://www.sayandeep.store
MEDUSA_GOOGLE_CALLBACK_URL=https://www.sayandeep.store/auth/callback
```

---

## Google Cloud Console (OAuth client for Medusa)

The storefront sends `callback_url` as **`{current origin}/auth/callback`** (e.g. if someone opens `https://sayandeep.store/auth`, Google must allow that origin and callback, not only `www`).

**Authorized JavaScript origins** — include every hostname you use:

- `https://www.sayandeep.store`
- `https://sayandeep.store`

**Authorized redirect URIs** — include both:

- `https://www.sayandeep.store/auth/callback`
- `https://sayandeep.store/auth/callback`

Keep **`MEDUSA_GOOGLE_CALLBACK_URL`** on Railway aligned with your primary domain (often `www`). If you standardize on `www`, add a Vercel redirect from apex → `www` so users don’t hit Google with a mismatched callback.

---

## Quick checks

- Storefront opens: [https://www.sayandeep.store](https://www.sayandeep.store)
- API health: `https://amby-backend-api.sayandeep.store/health` (or open a Store API route you use)
- Admin: `https://amby-backend-api.sayandeep.store/app`

If you change the **backend** subdomain, update every `amby-backend-api.sayandeep.store` line in this file and in Vercel.
