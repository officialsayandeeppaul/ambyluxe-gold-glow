import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type NominatimRow = {
  display_name?: string;
  address?: Record<string, string>;
};

type ParsedRow = {
  label: string;
  city: string;
  state: string;
  postcode: string;
  district: string;
};

function norm(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function stateMatchesSelected(osmState: string, selected: string): boolean {
  const b = selected.trim().toLowerCase();
  if (!b) return true;
  const a = osmState.trim().toLowerCase();
  if (!a) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function rowMatchesState(
  row: { label: string; city: string; state: string },
  selected: string,
): boolean {
  const st = selected.trim();
  if (!st) return true;
  if (stateMatchesSelected(row.state, st)) return true;
  const lump = `${row.label} ${row.city} ${row.state}`.toLowerCase();
  return lump.includes(st.toLowerCase());
}

function pickCity(a: Record<string, string>): string {
  return (
    a.city ||
    a.city_district ||
    a.town ||
    a.village ||
    a.municipality ||
    a.county ||
    a.state_district ||
    a.suburb ||
    a.neighbourhood ||
    a.hamlet ||
    ""
  );
}

function pickState(a: Record<string, string>): string {
  return a.state || a["ISO3166-2-lvl4"] || "";
}

function fallbackCityFromDisplayName(display: string, city: string): string {
  if (city.trim()) return city;
  const first = display.split(",").map((x) => x.trim())[0];
  return first || "";
}

function pickDistrictKey(a: Record<string, string>): string {
  return (
    a.state_district?.trim() ||
    a.county?.trim() ||
    a.municipality?.trim() ||
    ""
  );
}

function rowMatchesDistrict(
  row: { label: string; districtKey: string },
  selectedDistrict: string,
): boolean {
  const d = selectedDistrict.trim().toLowerCase();
  if (!d) return true;
  const key = row.districtKey.trim().toLowerCase();
  const lump = `${row.label} ${key}`.toLowerCase();
  if (key && (key === d || key.includes(d) || d.includes(key))) return true;
  return lump.includes(d);
}

function nominatimJsonToRows(body: unknown): NominatimRow[] {
  return Array.isArray(body) ? (body as NominatimRow[]) : [];
}

async function runNominatimSearch(searchQuery: string): Promise<NominatimRow[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("limit", "24");
  url.searchParams.set("q", searchQuery);
  const r = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "AmbyLuxeJewels/1.1 (Medusa-Checkout)",
    },
  });
  if (!r.ok) return [];
  let parsed: unknown;
  try {
    parsed = await r.json();
  } catch {
    return [];
  }
  return nominatimJsonToRows(parsed);
}

async function photonSuggest(query: string, state: string): Promise<ParsedRow[]> {
  if (!state.trim()) return [];
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", `${query}, ${state}, India`);
  u.searchParams.set("limit", "14");
  u.searchParams.set("lang", "en");
  try {
    const r = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    const feats = Array.isArray(j.features) ? j.features : [];
    const out: ParsedRow[] = [];
    for (const f of feats) {
      const p = f.properties ?? {};
      const country = String(p.country ?? "").toLowerCase();
      if (country && country !== "india") continue;
      const st = String(p.state ?? "");
      if (!stateMatchesSelected(st, state)) continue;
      const name = String(p.name ?? "");
      const cityName = String(p.city ?? p.district ?? name ?? "");
      if (!name && !cityName) continue;
      const distKey = String(p.county ?? p.district ?? "");
      const city = name || cityName;
      const label = [city, st || state, "India"].filter(Boolean).join(", ");
      out.push({
        label,
        city,
        state: st || state,
        postcode: String(p.postcode ?? ""),
        district: distKey,
      });
      if (out.length >= 14) break;
    }
    return out;
  } catch {
    return [];
  }
}

function mapNominatimToRows(raw: NominatimRow[]): ParsedRow[] {
  return raw
    .map((row) => {
      const a = row.address ?? {};
      const st = pickState(a);
      let city = pickCity(a);
      const postcode = a.postcode || "";
      const districtKey = pickDistrictKey(a);
      const label = row.display_name || [city, st].filter(Boolean).join(", ");
      city = fallbackCityFromDisplayName(label, city);
      return {
        label,
        city,
        state: st,
        postcode,
        district: districtKey,
      };
    })
    .filter((s) => s.city.trim().length > 0 || s.label.trim().length > 4);
}

function filterByStateAndDistrict(
  rows: ParsedRow[],
  state: string,
  district: string,
): ParsedRow[] {
  let suggestions = rows;
  if (state) {
    const narrowed = suggestions.filter((s) => rowMatchesState(s, state));
    suggestions = narrowed.length > 0 ? narrowed : suggestions;
  }
  if (district) {
    const narrowed = suggestions.filter((s) =>
      rowMatchesDistrict({ label: s.label, districtKey: s.district }, district),
    );
    suggestions = narrowed.length > 0 ? narrowed : suggestions;
  }
  return suggestions;
}

function scoreSuggestion(row: ParsedRow, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const city = norm(row.city);
  const label = norm(row.label);
  const district = norm(row.district);
  let score = 0;
  if (city === q) score += 100;
  else if (city.startsWith(q)) score += 70;
  else if (city.includes(q)) score += 40;
  else if (label.includes(q)) score += 25;
  if (district === q) score += 15;
  score += Math.max(0, 20 - Math.min(20, row.label.length / 8));
  return score;
}

function dedupeAndRankSuggestions(rows: ParsedRow[], query: string): ParsedRow[] {
  const byKey = new Map<string, ParsedRow>();
  for (const row of rows) {
    const key = [norm(row.city), norm(row.state), norm(row.district)].join("|");
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    // Keep the row with better query score; if tie, keep shorter label.
    const prevScore = scoreSuggestion(prev, query);
    const curScore = scoreSuggestion(row, query);
    if (curScore > prevScore || (curScore === prevScore && row.label.length < prev.label.length)) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const diff = scoreSuggestion(b, query) - scoreSuggestion(a, query);
      if (diff !== 0) return diff;
      return a.label.localeCompare(b.label);
    })
    .slice(0, 18);
}

/**
 * GET /store/in-location-suggest?q=...&state=...&district=...
 * Nominatim (India) with safe JSON parsing (errors are objects, not arrays).
 * Photon fallback when results are empty.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const q = String(req.query.q ?? "")
      .trim()
      .slice(0, 120);
    if (q.length < 2) {
      return res.status(200).json({ suggestions: [] as unknown[] });
    }

    const state = String(req.query.state ?? "")
      .trim()
      .slice(0, 80);
    const district = String(req.query.district ?? "")
      .trim()
      .slice(0, 80);

    const tail = [district, state, "India"].filter(Boolean).join(", ");
    const queries: string[] = [];
    if (district && state) queries.push(`${q}, ${tail}`);
    if (state) {
      queries.push(`${q}, ${state}, India`);
      if (district) queries.push(`${q} city, ${district}, ${state}, India`);
    }
    queries.push(`${q}, India`);

    const seen = new Set<string>();
    const raw: NominatimRow[] = [];
    for (const searchQuery of queries) {
      const batch = await runNominatimSearch(searchQuery);
      for (const row of batch) {
        const k = row.display_name ?? JSON.stringify(row.address ?? {});
        if (k && !seen.has(k)) {
          seen.add(k);
          raw.push(row);
        }
      }
      if (raw.length >= 10) break;
    }

    let suggestions = mapNominatimToRows(raw);
    suggestions = filterByStateAndDistrict(suggestions, state, district);
    suggestions = dedupeAndRankSuggestions(suggestions, q);

    if (suggestions.length === 0 && state) {
      const photon = await photonSuggest(q, state);
      suggestions = filterByStateAndDistrict(photon, state, district);
      suggestions = dedupeAndRankSuggestions(suggestions, q);
    }

    return res.status(200).json({ suggestions });
  } catch (e) {
    console.error("[in-location-suggest]", e);
    return res.status(200).json({ suggestions: [] });
  }
}
