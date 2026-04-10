import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { filterManualPromotionsByCartEligibility } from "./promo-eligibility";

type PromotionTarget = "order" | "items" | "shipping_methods" | null;
type CheckoutPromotionRow = {
  id: string;
  code: string;
  display_code: string;
  title: string;
  subtitle: string;
  badge: string | null;
  is_automatic: boolean;
  promotion_type: string;
  sort_order: number;
  application_target: PromotionTarget;
};

/**
 * GET /store/checkout-promotions
 * Active promotions for the storefront coupon list — fully driven by DB / Admin (no hardcoded codes).
 *
 * Optional promotion metadata (Admin → Promotion → Metadata):
 * - storefront_title       — card title (default: derived from code)
 * - storefront_subtitle    — card description (default: derived from discount type)
 * - storefront_code        — short label shown to shoppers (default: code without AMB_DEMO_ prefix)
 * - storefront_badge       — e.g. "Popular"
 * - storefront_sort_order  — number, lower first
 */

function readMetaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const v = metadata[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function readMetaNumber(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): number | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const v = metadata[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function stripAmbDemoPrefix(code: string): string {
  return code.replace(/^AMB_DEMO_/i, "").trim() || code.trim();
}

function humanizePromotionCode(code: string): string {
  const c = stripAmbDemoPrefix(code);
  if (!c) return "Special offer";
  return c
    .split("_")
    .map((part) => (part ? part.charAt(0) + part.slice(1).toLowerCase() : part))
    .join(" ");
}

/** Cart shape for promotion preview (computeActions). */
const PROMO_PREVIEW_CART_FIELDS = [
  "id",
  "currency_code",
  "email",
  "sales_channel_id",
  "region_id",
  "customer_id",
  "items.*",
  "items.product.*",
  "shipping_methods.*",
  "shipping_address.*",
  "customer.*",
] as string[];

function describeApplicationMethod(am: {
  type?: string | null;
  target_type?: string | null;
  value?: number | null;
} | null | undefined): string {
  if (!am?.type) return "Discount when your order qualifies.";
  const tgt =
    am.target_type === "order"
      ? "your order"
      : am.target_type === "items"
        ? "eligible items"
        : am.target_type === "shipping_methods"
          ? "shipping"
          : "your order";
  if (am.type === "percentage") {
    const v = am.value ?? 0;
    const label = Number.isInteger(v) ? String(v) : Number(v.toFixed(2));
    return `${label}% off ${tgt}.`;
  }
  if (am.type === "fixed") {
    return `Fixed amount off ${tgt}.`;
  }
  return `Offer on ${tgt}.`;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: rows } = await query.graph({
      entity: "promotion",
      fields: [
        "id",
        "code",
        "type",
        "status",
        "is_automatic",
        "metadata",
        "deleted_at",
        "application_method.type",
        "application_method.target_type",
        "application_method.allocation",
        "application_method.value",
        "application_method.currency_code",
      ],
      filters: { status: "active" },
    });

    const list: CheckoutPromotionRow[] = (rows ?? [])
      .filter((r) => {
        const row = r as { deleted_at?: unknown; code?: unknown };
        if (row.deleted_at != null && row.deleted_at !== "") return false;
        const code = typeof row.code === "string" ? row.code.trim() : "";
        return code.length > 0;
      })
      .map((r) => {
        const row = r as {
          id: string;
          code: string;
          type?: string;
          is_automatic?: boolean;
          metadata?: unknown;
          application_method?: {
            type?: string | null;
            target_type?: string | null;
            allocation?: string | null;
            value?: number | null;
            currency_code?: string | null;
          } | null;
        };
        const meta =
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : null;
        const title =
          readMetaString(meta, "storefront_title") ?? humanizePromotionCode(row.code);
        const subtitle =
          readMetaString(meta, "storefront_subtitle") ??
          describeApplicationMethod(row.application_method ?? undefined);
        const display_code =
          readMetaString(meta, "storefront_code") ?? stripAmbDemoPrefix(row.code);
        const badge = readMetaString(meta, "storefront_badge") ?? null;
        const sort_order = readMetaNumber(meta, "storefront_sort_order") ?? 0;

        const tt = row.application_method?.target_type;
        const application_target: PromotionTarget =
          tt === "order" || tt === "items" || tt === "shipping_methods" ? tt : null;

        return {
          id: row.id,
          code: row.code.trim(),
          display_code,
          title,
          subtitle,
          badge,
          is_automatic: Boolean(row.is_automatic),
          promotion_type: row.type ?? "standard",
          sort_order,
          application_target,
        };
      })
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.title.localeCompare(b.title);
      });

    const cartIdRaw = req.query?.cart_id;
    const cartId =
      typeof cartIdRaw === "string"
        ? cartIdRaw.trim()
        : Array.isArray(cartIdRaw) && typeof cartIdRaw[0] === "string"
          ? cartIdRaw[0].trim()
          : "";

    let responseList = list;

    if (cartId) {
      try {
        const cart = (await refetchCart(
          cartId,
          req.scope,
          PROMO_PREVIEW_CART_FIELDS,
        )) as Record<string, unknown>;

        const manual = list.filter((p) => !p.is_automatic);
        const automatic = list.filter((p) => p.is_automatic);
        const eligibleUpper = await filterManualPromotionsByCartEligibility({
          scope: req.scope,
          cart,
          manualPromotions: manual.map((p) => ({
            code: p.code,
            application_target: p.application_target,
          })),
        });

        const eligibleManual = manual.filter((p) =>
          eligibleUpper.has(p.code.trim().toUpperCase()),
        );

        responseList = [...automatic, ...eligibleManual].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.title.localeCompare(b.title);
        });
      } catch {
        /* cart missing / invalid — return unfiltered list */
      }
    }

    res.status(200).json({ promotions: responseList });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({
      message: "Could not load checkout promotions.",
      type: "server_error",
      detail: process.env.NODE_ENV === "development" ? msg : undefined,
    });
  }
}
