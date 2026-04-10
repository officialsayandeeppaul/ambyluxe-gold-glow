import { isMedusaConfigured } from '@/integrations/medusa/client';

const PUBLISHABLE_HEADER = 'x-publishable-api-key';

export type IndiaPinVerifyResponse = {
  ok: boolean;
  pin?: string;
  state?: string;
  district?: string;
  offices?: string[];
  error?: string;
  /** Which upstream answered (India Post API vs Zippopotam). */
  source?: string;
};

/**
 * Confirms PIN exists in India Post directory and returns canonical state / area names.
 */
export async function fetchIndiaPinVerify(pin: string): Promise<IndiaPinVerifyResponse> {
  const digits = pin.replace(/\D/g, '').slice(0, 6);
  if (!/^[1-9][0-9]{5}$/.test(digits)) {
    return { ok: false, error: 'invalid_format' };
  }
  if (!isMedusaConfigured()) {
    return { ok: false, error: 'no_medusa' };
  }
  const base = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? '';
  if (!base || !key) {
    return { ok: false, error: 'no_key' };
  }

  const u = new URL(`${base}/store/in-pin-verify`);
  u.searchParams.set('pin', digits);
  const r = await fetch(u.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      [PUBLISHABLE_HEADER]: key,
    },
    credentials: 'omit',
  });
  if (!r.ok) {
    return { ok: false, error: 'http' };
  }
  return (await r.json()) as IndiaPinVerifyResponse;
}
