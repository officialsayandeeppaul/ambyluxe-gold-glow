import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { addToCartWorkflowId } from "@medusajs/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import { defaultStoreCartFields } from "@medusajs/medusa/api/store/carts/query-config";

/** `defaultStoreCartFields` includes `*region.countries` / `*payment_collection` — Remote Query passes those to MikroORM as invalid `*region` populates on Cart. Strip glob entries for this refetch. */
const lineItemsCustomRefetchFields = defaultStoreCartFields.filter((f) => !f.startsWith("*"));

type CustomLineBody = {
  variant_id: string;
  quantity: number;
  metadata?: Record<string, unknown>;
  /** Smallest currency unit (e.g. paise for INR) — same as Medusa `unit_price`. */
  unit_price: number;
};

function parseBody(raw: unknown): CustomLineBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const variant_id = typeof b.variant_id === "string" ? b.variant_id.trim() : "";
  const quantity = typeof b.quantity === "number" && b.quantity > 0 ? b.quantity : 0;
  const unit_price =
    typeof b.unit_price === "number" && Number.isFinite(b.unit_price) && b.unit_price > 0
      ? Math.trunc(b.unit_price)
      : 0;
  if (!variant_id || !quantity || !unit_price) return null;
  const meta = b.metadata;
  const metadata =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : undefined;
  return { variant_id, quantity, metadata, unit_price };
}

/**
 * POST /store/carts/:id/line-items-custom
 * Same auth as default line-items; adds a variant with an explicit `unit_price` (Medusa minor units).
 * Used for gift hampers where storefront price = base + slot surcharges — standard Store API omits custom price.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.params.id;
  if (!cartId?.trim()) {
    return res.status(400).json({ message: "Missing cart id" });
  }

  const parsed = parseBody(req.body);
  if (!parsed) {
    return res.status(400).json({
      message: "Body must include variant_id, quantity (>0), and unit_price (positive integer, minor units).",
    });
  }

  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE);
  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: cartId,
      items: [
        {
          variant_id: parsed.variant_id,
          quantity: parsed.quantity,
          ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
          unit_price: parsed.unit_price,
        },
      ],
    },
  });

  const cart = await refetchCart(cartId, req.scope, lineItemsCustomRefetchFields);
  return res.status(200).json({ cart });
}
