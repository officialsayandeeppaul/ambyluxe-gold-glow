/**
 * Base URL for storefront-hosted product images (`/images/products/*`).
 * Used by seed, ensure-collections, and backfill scripts.
 *
 * Priority:
 * 1. SEED_STOREFRONT_BASE_URL — explicit override (e.g. one-off seed on Railway)
 * 2. STORE_PUBLIC_URL — production storefront (often already set on Railway/Vercel)
 * 3. http://localhost:8080 — local Vite default
 */
export function getStorefrontImageBase(): string {
  const a = process.env.SEED_STOREFRONT_BASE_URL?.replace(/\/$/, "").trim();
  if (a) return a;
  const b = process.env.STORE_PUBLIC_URL?.replace(/\/$/, "").trim();
  if (b) return b;
  return "http://localhost:8080";
}

export function storefrontProductImageUrl(filename: string): string {
  return `${getStorefrontImageBase()}/images/products/${filename}`;
}

/** Patterns seeded URLs may use before backfill. */
export const LOCALHOST_IMG_PREFIXES = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "https://localhost:8080",
  "http://localhost:9000",
  "http://127.0.0.1:9000",
];

const LOCALHOST_ORIGIN_RE_G = /\bhttps?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi;
const LOCALHOST_ORIGIN_RE_TEST = /\bhttps?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

/** Replace any http(s)://localhost(:port)? or 127.0.0.1 origin with `base` (path/query/hash preserved). */
export function rewriteLocalhostOriginsToBase(s: string, base: string): string {
  return s.replace(LOCALHOST_ORIGIN_RE_G, base);
}

export function stringLooksLikeSeededLocalhostUrl(s: string): boolean {
  return LOCALHOST_ORIGIN_RE_TEST.test(s);
}
