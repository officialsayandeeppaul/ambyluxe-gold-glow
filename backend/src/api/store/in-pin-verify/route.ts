import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type PostalPincodeOffice = {
  Name?: string;
  District?: string;
  State?: string;
};

type PostalPincodeResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: PostalPincodeOffice[] | PostalPincodeOffice | null;
};

type ZippopotamPlace = {
  "place name"?: string;
  state?: string;
};

type ZippopotamResponse = {
  country?: string;
  places?: ZippopotamPlace[];
};

function normalizeOffices(post: unknown): PostalPincodeOffice[] {
  if (post == null) return [];
  if (Array.isArray(post)) return post.filter(Boolean) as PostalPincodeOffice[];
  if (typeof post === "object") return [post as PostalPincodeOffice];
  return [];
}

function postalPincodeSuccess(json: PostalPincodeResponse): boolean {
  const st = String(json.Status ?? "")
    .trim()
    .toLowerCase();
  if (st === "success") return true;
  const msg = String(json.Message ?? "")
    .toLowerCase();
  return msg.includes("found") && !msg.includes("0 pincode");
}

async function lookupPostalPincodeIn(
  pin: string,
): Promise<{ state: string; district: string; offices: string[] } | null> {
  const url = `https://api.postalpincode.in/pincode/${pin}`;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 12_000);
  try {
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AmbyLuxeMedusaCheckout/1.1 (pin verify)",
      },
      signal: ac.signal,
    });
    clearTimeout(to);
    if (!r.ok) return null;

    let json: PostalPincodeResponse;
    try {
      const text = await r.text();
      json = JSON.parse(text) as PostalPincodeResponse;
    } catch {
      return null;
    }

    if (!postalPincodeSuccess(json)) return null;

    const offices = normalizeOffices(json.PostOffice);
    if (offices.length === 0) return null;

    const state = offices[0].State?.trim() ?? "";
    const district = offices[0].District?.trim() ?? "";
    const names = offices
      .map((o) => o.Name?.trim())
      .filter((n): n is string => Boolean(n))
      .slice(0, 12);

    return { state, district, offices: names };
  } catch {
    clearTimeout(to);
    return null;
  }
}

/** Zippopotam.us secondary source (JSON, reliable for many India PINs). */
async function lookupZippopotamIn(
  pin: string,
): Promise<{ state: string; district: string; offices: string[] } | null> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 10_000);
  try {
    const r = await fetch(`https://api.zippopotam.us/in/${pin}`, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as ZippopotamResponse;
    const places = json.places;
    if (!Array.isArray(places) || places.length === 0) return null;
    const state = places[0].state?.trim() ?? "";
    const names = places
      .map((p) => p["place name"]?.trim())
      .filter((n): n is string => Boolean(n))
      .slice(0, 12);
    const district = names[0] ?? "";
    return { state, district, offices: names };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/**
 * GET /store/in-pin-verify?pin=XXXXXX
 * Validates Indian PIN (India Post directory + Zippopotam fallback).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = String(req.query.pin ?? "").replace(/\D/g, "").slice(0, 6);
  if (!/^\d{6}$/.test(raw)) {
    return res.status(200).json({ ok: false, error: "invalid_format" });
  }

  let found = await lookupPostalPincodeIn(raw);
  let source: "postalpincode" | "zippopotam" = "postalpincode";
  if (!found || !found.state) {
    found = await lookupZippopotamIn(raw);
    source = "zippopotam";
  }

  if (!found || !found.state) {
    return res.status(200).json({ ok: false, error: "not_found" });
  }

  return res.status(200).json({
    ok: true,
    pin: raw,
    state: found.state,
    district: found.district,
    offices: found.offices,
    source,
  });
}
