import catalog from '@/data/indiaDistrictsCatalog.json';
import type { InDistrictSuggestion } from '@/lib/medusa/storeSuggest';

type CatalogRow = { name: string; districts: string[] };

function catalogRows(): CatalogRow[] {
  const c = catalog as { states: CatalogRow[]; union_territories: CatalogRow[] };
  return [...c.states, ...c.union_territories];
}

function districtsForState(stateProvince: string): string[] | null {
  const q = stateProvince.trim().toLowerCase();
  if (!q) return null;
  const row = catalogRows().find((r) => r.name.toLowerCase() === q);
  return row ? [...row.districts] : null;
}

/**
 * District list for checkout (same pattern as {@link filterStates}): substring + word-prefix
 * match on the official names for the selected state / UT.
 */
export function filterDistrictsForState(
  stateProvince: string,
  query: string,
): InDistrictSuggestion[] {
  const districts = districtsForState(stateProvince);
  if (!districts?.length) return [];

  const state = stateProvince.trim();
  const q = query.trim().toLowerCase();

  const filtered = !q
    ? districts
    : districts.filter((d) => {
        const dl = d.toLowerCase();
        if (dl.includes(q)) return true;
        return d.split(/[\s,-]+/).some((w) => {
          const wl = w.toLowerCase();
          return wl.startsWith(q) || q.startsWith(wl);
        });
      });

  const cap = 120;
  return filtered.slice(0, cap).map((district) => ({
    label: `${district}, ${state}`,
    district,
  }));
}
