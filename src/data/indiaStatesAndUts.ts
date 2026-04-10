/** India states and union territories — display names for checkout / Medusa `province`. */
export const INDIA_STATES_AND_UTS: readonly string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export function filterStates(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...INDIA_STATES_AND_UTS];
  return INDIA_STATES_AND_UTS.filter((s) => s.toLowerCase().includes(q));
}

/** Map OSM / geocoder state string to our canonical list when possible. */
export function matchIndiaStateLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  const exact = INDIA_STATES_AND_UTS.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  const contains = INDIA_STATES_AND_UTS.find(
    (s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower),
  );
  return contains ?? t;
}
