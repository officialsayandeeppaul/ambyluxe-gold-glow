import type { OrderDTO } from "@medusajs/types";

/** Medusa money fields: number, string, or BigNumber-like `{ numeric_ | numeric | value }`. */
export function medusaMoneyMinor(raw: unknown): number {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") return Number(raw) || 0;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.numeric_ != null) return Number(o.numeric_) || 0;
    if (o.numeric != null) return Number(o.numeric) || 0;
    if (o.value != null) return Number(o.value) || 0;
  }
  return 0;
}

/**
 * Order `total` is sometimes unset or not coerced by a naive `Number()` in subscribers.
 * Prefer `total`, then subtotal + shipping + tax − discount, then sum of line totals + adjustments.
 */
export function orderGrandTotalMinor(order: OrderDTO): number {
  const direct = medusaMoneyMinor((order as { total?: unknown }).total);
  if (direct > 0) return direct;

  const ship = medusaMoneyMinor((order as { shipping_total?: unknown }).shipping_total);
  const tax = medusaMoneyMinor((order as { tax_total?: unknown }).tax_total);
  const disc = medusaMoneyMinor((order as { discount_total?: unknown }).discount_total);

  let lines = 0;
  for (const it of order.items ?? []) {
    lines += medusaMoneyMinor((it as { total?: unknown }).total);
  }
  if (lines > 0) return Math.max(0, lines + ship + tax - disc);

  const sub = medusaMoneyMinor((order as { subtotal?: unknown }).subtotal);
  return Math.max(0, sub + ship + tax - disc);
}
