/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Medusa Store API base (e.g. http://localhost:9000) */
  readonly VITE_MEDUSA_URL?: string;
  /** From Medusa Admin → Settings → Publishable API keys */
  readonly VITE_MEDUSA_PUBLISHABLE_KEY?: string;
  /** Optional; defaults to VITE_MEDUSA_URL + /app */
  readonly VITE_MEDUSA_ADMIN_URL?: string;
  /** Comma-separated emails allowed to open /admin hub after customer login */
  readonly VITE_STORE_ADMIN_EMAILS?: string;
  /** Optional provider id; default `google` */
  readonly VITE_MEDUSA_AUTH_GOOGLE_PROVIDER?: string;
  /** Optional comma-separated provider ids; default `phone,phonepass,otp` */
  readonly VITE_MEDUSA_AUTH_PHONE_PROVIDER?: string;
  /** Pin Store API to a Medusa region (Admin → Settings → Regions). Fixes wrong or zero prices. */
  readonly VITE_MEDUSA_REGION_ID?: string;
  /** Prefer first region with this currency code (e.g. inr) when region id is not set. */
  readonly VITE_MEDUSA_DEFAULT_CURRENCY?: string;
  /** Razorpay Key ID for Checkout.js (same value as dashboard Key Id). */
  readonly VITE_RAZORPAY_KEY_ID?: string;
  /**
   * Google Maps JS API key with Places enabled — structured Indian addresses at checkout.
   * Without it, checkout uses India Post PIN verify + strict manual fields.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
