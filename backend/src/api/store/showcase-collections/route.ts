import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Keys saved by the Amby Luxe admin widget — exposed read-only to the storefront.
 * Default Medusa Store `GET /store/collections` often omits `metadata`, so descriptions never render.
 */
const STOREFRONT_COLLECTION_META_KEYS = [
  "storefront_tagline",
  "storefront_short",
  "storefront_long",
  "hero_image",
  "sort_order",
  "storefront_home",
] as const;

function pickPublicMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of STOREFRONT_COLLECTION_META_KEYS) {
    const v = m[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * GET /store/showcase-collections
 * Publishable API key required (same as other Store routes).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: rows } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title", "metadata", "deleted_at"],
  });

  const collections = (rows ?? [])
    .filter((c) => {
      const d = (c as { deleted_at?: string | Date | null }).deleted_at;
      return d == null || d === "";
    })
    .map((c) => {
      const row = c as { id: string; handle?: string | null; title?: string | null; metadata?: unknown };
      return {
        id: row.id,
        handle: row.handle ?? "",
        title: row.title ?? "",
        metadata: pickPublicMetadata(row.metadata),
      };
    });

  res.status(200).json({ collections });
}
