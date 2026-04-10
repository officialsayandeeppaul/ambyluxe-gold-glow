import type {
  ComputeActionAdjustmentLine,
  ComputeActionContext,
  ComputeActionItemLine,
  ComputeActionShippingLine,
  ComputeActions,
  IPromotionModuleService,
} from "@medusajs/types";
import { Modules } from "@medusajs/framework/utils";

function bnToNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "object" && v !== null && "numeric" in v) {
    const n = Number((v as { numeric: unknown }).numeric);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function actionsYieldDiscount(actions: ComputeActions[]): boolean {
  for (const a of actions) {
    if (a.action === "addItemAdjustment" && bnToNumber(a.amount) > 0) return true;
    if (a.action === "addShippingMethodAdjustment" && bnToNumber(a.amount) > 0)
      return true;
  }
  return false;
}

function itemLineFromRemote(item: Record<string, unknown>): ComputeActionItemLine | null {
  const id = typeof item.id === "string" ? item.id : "";
  if (!id) return null;
  const qty = bnToNumber(item.quantity);
  const unit = bnToNumber(item.unit_price);
  const subtotal = bnToNumber(
    item.subtotal ?? item.raw_subtotal ?? (unit > 0 ? unit * qty : 0),
  );
  const original_total = bnToNumber(
    item.original_total ?? item.subtotal ?? item.total ?? subtotal,
  );

  let productId: string | undefined;
  if (item.product_id && typeof item.product_id === "string")
    productId = item.product_id;
  else if (
    item.product &&
    typeof item.product === "object" &&
    item.product !== null &&
    "id" in item.product
  ) {
    const pid = (item.product as { id?: unknown }).id;
    if (typeof pid === "string") productId = pid;
  }

  const adjustments: ComputeActionAdjustmentLine[] = Array.isArray(
    item.adjustments,
  )
    ? (item.adjustments as Record<string, unknown>[])
        .map((adj) => {
          const adjId = typeof adj.id === "string" ? adj.id : "";
          if (!adjId) return null;
          const code =
            typeof adj.code === "string"
              ? adj.code
              : typeof adj.promotion_code === "string"
                ? adj.promotion_code
                : "";
          const row: ComputeActionAdjustmentLine = { id: adjId, code: code || "" };
          return row;
        })
        .filter((x): x is ComputeActionAdjustmentLine => x != null)
    : [];

  const row: ComputeActionItemLine = {
    id,
    quantity: qty,
    subtotal,
    original_total: original_total || subtotal,
    is_discountable: item.is_discountable !== false,
  };
  if (adjustments.length) row.adjustments = adjustments;
  if (productId) row.product = { id: productId };
  return row;
}

function shippingLineFromRemote(sm: Record<string, unknown>): ComputeActionShippingLine | null {
  const id = typeof sm.id === "string" ? sm.id : "";
  if (!id) return null;
  const subtotal = bnToNumber(
    sm.subtotal ?? sm.amount ?? sm.raw_amount ?? sm.total ?? 0,
  );
  const original_total = bnToNumber(
    sm.original_total ?? sm.amount ?? sm.total ?? subtotal,
  );
  const adjustments: ComputeActionAdjustmentLine[] = Array.isArray(
    sm.adjustments,
  )
    ? (sm.adjustments as Record<string, unknown>[])
        .map((adj) => {
          const adjId = typeof adj.id === "string" ? adj.id : "";
          if (!adjId) return null;
          const code =
            typeof adj.code === "string"
              ? adj.code
              : typeof adj.promotion_code === "string"
                ? adj.promotion_code
                : "";
          const row: ComputeActionAdjustmentLine = { id: adjId, code: code || "" };
          return row;
        })
        .filter((x): x is ComputeActionAdjustmentLine => x != null)
    : [];
  const row: ComputeActionShippingLine = {
    id,
    subtotal,
    original_total: original_total || subtotal,
  };
  if (adjustments.length) row.adjustments = adjustments;
  return row;
}

export function cartToComputeContext(
  cart: Record<string, unknown>,
): ComputeActionContext {
  const currency =
    typeof cart.currency_code === "string" ? cart.currency_code : "usd";

  const itemsIn = Array.isArray(cart.items) ? cart.items : [];
  const items: ComputeActionItemLine[] = itemsIn
    .map((it) =>
      itemLineFromRemote(
        it && typeof it === "object"
          ? (it as Record<string, unknown>)
          : {},
      ),
    )
    .filter((x): x is ComputeActionItemLine => x != null);

  const shipIn = Array.isArray(cart.shipping_methods)
    ? cart.shipping_methods
    : [];
  const shipping_methods: ComputeActionShippingLine[] = shipIn
    .map((sm) =>
      shippingLineFromRemote(
        sm && typeof sm === "object"
          ? (sm as Record<string, unknown>)
          : {},
      ),
    )
    .filter((x): x is ComputeActionShippingLine => x != null);

  const ctx: ComputeActionContext = {
    currency_code: currency,
    items,
    shipping_methods,
  };

  if (typeof cart.email === "string" && cart.email.trim())
    ctx.email = cart.email.trim();
  if (typeof cart.sales_channel_id === "string" && cart.sales_channel_id)
    ctx.sales_channel_id = cart.sales_channel_id;
  if (typeof cart.region_id === "string" && cart.region_id)
    ctx.region = { id: cart.region_id };

  if (
    cart.shipping_address &&
    typeof cart.shipping_address === "object" &&
    cart.shipping_address !== null
  ) {
    const cc = (cart.shipping_address as { country_code?: unknown })
      .country_code;
    if (typeof cc === "string" && cc)
      ctx.shipping_address = { country_code: cc.toLowerCase() };
  }

  if (
    cart.customer &&
    typeof cart.customer === "object" &&
    cart.customer !== null &&
    "id" in cart.customer
  ) {
    const cid = (cart.customer as { id?: unknown }).id;
    if (typeof cid === "string" && cid) {
      ctx.customer = { id: cid };
    }
  } else if (typeof cart.customer_id === "string" && cart.customer_id) {
    ctx.customer = { id: cart.customer_id };
  }

  return ctx;
}

export async function filterManualPromotionsByCartEligibility(input: {
  scope: { resolve: (k: string) => unknown };
  cart: Record<string, unknown>;
  manualPromotions: {
    code: string;
    application_target?: "order" | "items" | "shipping_methods" | null;
  }[];
}): Promise<Set<string>> {
  const eligible = new Set<string>();
  const promotionService = input.scope.resolve(
    Modules.PROMOTION,
  ) as IPromotionModuleService;

  const ctx = cartToComputeContext(input.cart);

  for (const p of input.manualPromotions) {
    const code = p.code?.trim();
    if (!code) continue;

    /**
     * Shipping-target codes (e.g. free delivery) never get computeActions discounts until the cart
     * has a shipping method — shoppers should still see and apply them earlier in checkout.
     */
    if (p.application_target === "shipping_methods") {
      eligible.add(code.toUpperCase());
      continue;
    }

    try {
      const actions = await promotionService.computeActions([code], ctx, {
        prevent_auto_promotions: true,
      });
      if (actionsYieldDiscount(actions)) eligible.add(code.toUpperCase());
    } catch {
      /* ignore */
    }
  }

  return eligible;
}
