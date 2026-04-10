import Medusa from '@medusajs/js-sdk';

const baseUrl = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
const publishableKeyRaw = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY ?? '';
const publishableKey = publishableKeyRaw.trim();

const PLACEHOLDER_KEYS = new Set(['', 'pk_replace_with_your_key', 'pk_...']);

function hasValidPublishableKey(): boolean {
  if (!publishableKey) return false;
  if (PLACEHOLDER_KEYS.has(publishableKey)) return false;
  return true;
}

let warnedMissingPublishableKey = false;

/** Medusa Store API client (JWT). Requires running Medusa backend — see /backend/README.md */
export const medusa = new Medusa({
  baseUrl: baseUrl || 'http://localhost:9000',
  debug: import.meta.env.DEV,
  publishableKey: hasValidPublishableKey() ? publishableKey : undefined,
  auth: {
    type: 'jwt',
  },
});

/**
 * True when the storefront should call Medusa (URL + publishable key).
 * Without a real key, Medusa returns "A valid publishable key is required" and the app falls back to static demo data.
 */
export function isMedusaConfigured(): boolean {
  if (!baseUrl) return false;
  if (!hasValidPublishableKey()) {
    if (
      import.meta.env.DEV &&
      baseUrl &&
      !warnedMissingPublishableKey
    ) {
      warnedMissingPublishableKey = true;
      console.warn(
        '[Amby Luxe] Set VITE_MEDUSA_PUBLISHABLE_KEY in .env (Medusa Store API requires it). ' +
          'Until then, the demo catalogue is used. From backend: npm run print-publishable-key'
      );
    }
    return false;
  }
  return true;
}
