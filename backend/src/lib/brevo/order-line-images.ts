import type { OrderDTO, OrderLineItemDTO } from "@medusajs/types";

/**
 * Medusa file URLs in emails must be absolute (https). Set MEDUSA_BACKEND_PUBLIC_URL
 * (no trailing slash) when thumbnails are stored as paths like /static/...
 */
export function absolutizeMedusaFileUrlForEmail(raw: string | null | undefined): string {
  const u = typeof raw === "string" ? raw.trim() : "";
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const base = (process.env.MEDUSA_BACKEND_PUBLIC_URL || "").replace(/\/$/, "").trim();
  if (!base) return "";
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${base}${path}`;
}

function lineThumbnail(line: OrderLineItemDTO | undefined): string {
  if (!line) return "";
  const row = line as {
    thumbnail?: string | null;
    variant?: { thumbnail?: string | null } | null;
    product?: { thumbnail?: string | null } | null;
    detail?: { thumbnail?: string | null } | null;
  };
  const v = typeof row.variant?.thumbnail === "string" ? row.variant.thumbnail.trim() : "";
  if (v) return v;
  const p = typeof row.product?.thumbnail === "string" ? row.product.thumbnail.trim() : "";
  if (p) return p;
  const fromDetail =
    typeof row.detail?.thumbnail === "string" ? row.detail.thumbnail.trim() : "";
  if (fromDetail) return fromDetail;
  const top = row.thumbnail;
  return typeof top === "string" ? top.trim() : "";
}

function lineTitle(line: OrderLineItemDTO | undefined): string {
  if (!line) return "";
  const t =
    (line.product_title || line.title || line.variant_title || "").trim() || "Item";
  return t;
}

/** Params for Brevo image URL / alt: first three order lines (hero + “you may also like”). */
export function brevoOrderLineImageTemplateParams(order: OrderDTO): Record<string, string> {
  const items = order.items ?? [];
  const slots = [
    ["FIRST", items[0]],
    ["SECOND", items[1]],
    ["THIRD", items[2]],
  ] as const;
  const out: Record<string, string> = {};
  for (const [prefix, line] of slots) {
    out[`${prefix}_LINE_ITEM_IMAGE_URL`] = absolutizeMedusaFileUrlForEmail(lineThumbnail(line));
    out[`${prefix}_LINE_ITEM_TITLE`] = lineTitle(line);
  }
  return out;
}
