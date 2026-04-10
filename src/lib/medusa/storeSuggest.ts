import { isMedusaConfigured } from '@/integrations/medusa/client';

const PUBLISHABLE_HEADER = 'x-publishable-api-key';

export type InLocationSuggestion = {
  label: string;
  city: string;
  state: string;
  postcode: string;
  /** OSM district / state_district when available */
  district?: string;
};

export type InDistrictSuggestion = {
  label: string;
  district: string;
};

export type FetchIndiaSuggestionsOptions = {
  /** Canonical state / UT label from checkout — biases Nominatim and filters results. */
  stateProvince?: string;
  /** District / division chosen after state — tightens city search. */
  district?: string;
};

/**
 * City / area suggestions (India) via Medusa proxy → Nominatim.
 */
export async function fetchIndiaLocationSuggestions(
  query: string,
  options?: FetchIndiaSuggestionsOptions,
): Promise<InLocationSuggestion[]> {
  if (!isMedusaConfigured()) return [];
  const base = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? '';
  if (!base || !key) return [];

  const u = new URL(`${base}/store/in-location-suggest`);
  u.searchParams.set('q', query.trim().slice(0, 120));
  const st = options?.stateProvince?.trim();
  if (st) u.searchParams.set('state', st.slice(0, 80));
  const dist = options?.district?.trim();
  if (dist) u.searchParams.set('district', dist.slice(0, 80));

  const r = await fetch(u.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      [PUBLISHABLE_HEADER]: key,
    },
    credentials: 'omit',
  });
  if (!r.ok) return [];
  const json = (await r.json()) as { suggestions?: InLocationSuggestion[] };
  return Array.isArray(json.suggestions) ? json.suggestions : [];
}

/**
 * District suggestions after state (Nominatim via Medusa).
 */
export async function fetchIndiaDistrictSuggestions(
  query: string,
  stateProvince: string,
): Promise<InDistrictSuggestion[]> {
  if (!isMedusaConfigured()) return [];
  const base = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? '';
  if (!base || !key) return [];

  const u = new URL(`${base}/store/in-district-suggest`);
  u.searchParams.set('q', query.trim().slice(0, 80));
  u.searchParams.set('state', stateProvince.trim().slice(0, 80));

  const r = await fetch(u.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      [PUBLISHABLE_HEADER]: key,
    },
    credentials: 'omit',
  });
  if (!r.ok) return [];
  const json = (await r.json()) as { suggestions?: InDistrictSuggestion[] };
  return Array.isArray(json.suggestions) ? json.suggestions : [];
}
