import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type NominatimRow = {
  display_name?: string;
  address?: Record<string, string>;
};

function pickState(a: Record<string, string>): string {
  return a.state || a["ISO3166-2-lvl4"] || "";
}

function rowMatchesState(display: string, osmState: string, selected: string): boolean {
  const st = selected.trim().toLowerCase();
  if (!st) return true;
  const a = osmState.trim().toLowerCase();
  if (a && (a === st || a.includes(st) || st.includes(a))) return true;
  return display.toLowerCase().includes(st);
}

function pickDistrictName(a: Record<string, string>): string {
  return (
    a.state_district?.trim() ||
    a.county?.trim() ||
    a.municipality?.trim() ||
    ""
  );
}

/**
 * GET /store/in-district-suggest?q=...&state=...
 * District / division names within a state (Nominatim, India).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = String(req.query.q ?? "")
    .trim()
    .slice(0, 80);
  const state = String(req.query.state ?? "")
    .trim()
    .slice(0, 80);

  if (q.length < 2 || !state) {
    return res.status(200).json({ suggestions: [] as unknown[] });
  }

  const runSearch = async (searchQuery: string): Promise<NominatimRow[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("limit", "30");
    url.searchParams.set("q", searchQuery);
    const r = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "AmbyLuxeJewels/1.1 (Medusa-Checkout)",
      },
    });
    if (!r.ok) return [];
    return ((await r.json()) as NominatimRow[]) ?? [];
  };

  let raw: NominatimRow[] = [];
  try {
    raw = await runSearch(`${q}, ${state}, India`);
    if (raw.length < 4) {
      const more = await runSearch(`${q} district, ${state}, India`);
      const seen = new Set(raw.map((x) => x.display_name ?? ""));
      for (const row of more) {
        const k = row.display_name ?? "";
        if (k && !seen.has(k)) {
          seen.add(k);
          raw.push(row);
        }
      }
    }
  } catch {
    return res.status(200).json({ suggestions: [] });
  }

  const seen = new Set<string>();
  const suggestions: { label: string; district: string }[] = [];

  for (const row of raw) {
    const a = row.address ?? {};
    const display = row.display_name ?? "";
    const st = pickState(a);
    if (!rowMatchesState(display, st, state)) continue;

    let name = pickDistrictName(a);
    if (!name) {
      const parts = display.split(",").map((x) => x.trim());
      if (parts.length >= 2) name = parts[0];
    }
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      label: `${name}, ${state}`,
      district: name,
    });
    if (suggestions.length >= 22) break;
  }

  return res.status(200).json({ suggestions });
}
