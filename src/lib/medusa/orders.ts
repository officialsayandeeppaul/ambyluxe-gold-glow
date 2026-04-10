import type { HttpTypes } from '@medusajs/types';
import { medusa } from '@/integrations/medusa/client';
import { medusaMinorToMajor } from '@/lib/medusa/currency';
import { formatPrice } from '@/lib/products';

/** Store API: list rows + first-line previews (thumbnail, title) for heritage table. */
export const ORDER_LIST_FIELDS = [
  '+display_id',
  'id',
  'status',
  'created_at',
  'currency_code',
  'total',
  'payment_status',
  'fulfillment_status',
  'email',
  '*items',
  '*items.variant',
  '*items.variant.product',
].join(',');

export const ORDER_DETAIL_FIELDS = [
  '+display_id',
  'id',
  'status',
  'created_at',
  'updated_at',
  'currency_code',
  'total',
  'subtotal',
  'shipping_total',
  'tax_total',
  'discount_total',
  'email',
  'payment_status',
  'fulfillment_status',
  '*items',
  '*items.variant',
  '*items.variant.product',
  '*shipping_address',
  '*billing_address',
  '*fulfillments',
  '*fulfillments.labels',
  '+metadata',
].join(',');

export function formatOrderMajorAmount(
  amount: number | null | undefined,
  currencyCode: string,
): string {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  const major = medusaMinorToMajor(Number(amount), currencyCode);
  return formatPrice(major, currencyCode);
}

export type ShiprocketOrderMeta = {
  status?: 'success' | 'error';
  pushed_at?: string;
  channel_order_id?: string;
  sr_order_id?: number | string;
  shipment_id?: number | string;
  medusa_fulfillment_id?: string;
  last_error?: string;
};

export function getShiprocketMeta(
  metadata: Record<string, unknown> | null | undefined,
): ShiprocketOrderMeta | undefined {
  const raw = metadata?.shiprocket;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ShiprocketOrderMeta;
  }
  return undefined;
}

export type StoreFulfillmentLabel = {
  tracking_number?: string | null;
  tracking_url?: string | null;
  label_url?: string | null;
};

export type StoreFulfillmentLike = {
  id?: string;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  canceled_at?: string | null;
  labels?: StoreFulfillmentLabel[] | null;
};

export function getOrderFulfillments(order: HttpTypes.StoreOrder): StoreFulfillmentLike[] {
  const o = order as HttpTypes.StoreOrder & { fulfillments?: StoreFulfillmentLike[] | null };
  return Array.isArray(o.fulfillments) ? o.fulfillments : [];
}

export function collectTrackingLines(fulfillments: StoreFulfillmentLike[]): {
  tracking_number?: string;
  tracking_url?: string;
}[] {
  const out: { tracking_number?: string; tracking_url?: string }[] = [];
  for (const f of fulfillments) {
    for (const l of f.labels ?? []) {
      if (!l) continue;
      const num = l.tracking_number?.trim();
      const url = l.tracking_url?.trim();
      if (num || url) out.push({ tracking_number: num, tracking_url: url });
    }
  }
  return out;
}

export function humanizeOrderStatus(raw: string | null | undefined): string {
  if (!raw) return '—';
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function paymentStatusLabel(raw: string | null | undefined): string {
  if (!raw) return '—';
  const m: Record<string, string> = {
    captured: 'Paid',
    authorized: 'Authorized',
    awaiting: 'Awaiting payment',
    not_paid: 'Unpaid',
    canceled: 'Cancelled',
    refunded: 'Refunded',
    partially_refunded: 'Partially refunded',
  };
  return m[raw] ?? humanizeOrderStatus(raw);
}

export function fulfillmentStatusLabel(raw: string | null | undefined): string {
  if (!raw) return '—';
  const m: Record<string, string> = {
    fulfilled: 'Fulfilled',
    partially_fulfilled: 'Partially shipped',
    not_fulfilled: 'Not shipped yet',
    shipped: 'Shipped',
    delivered: 'Delivered',
    canceled: 'Cancelled',
  };
  return m[raw] ?? humanizeOrderStatus(raw);
}

export function orderDisplayLabel(order: HttpTypes.StoreOrder): string {
  const d = (order as { display_id?: number | string }).display_id;
  if (d != null && String(d).length > 0) return `#${d}`;
  return order.id.slice(-8).toUpperCase();
}

type LineItemLike = HttpTypes.StoreOrderLineItem & {
  variant?: {
    id?: string;
    product?: { id?: string; handle?: string | null; title?: string | null; thumbnail?: string | null };
  };
};

export function lineItemTitle(item: HttpTypes.StoreOrderLineItem): string {
  const li = item as LineItemLike;
  return (
    item.product_title ||
    li.variant?.product?.title ||
    item.title ||
    item.variant_title ||
    'Item'
  );
}

export function lineItemProductHandle(item: HttpTypes.StoreOrderLineItem): string | undefined {
  const li = item as LineItemLike;
  const h = li.variant?.product?.handle?.trim();
  return h || undefined;
}

export function lineItemThumbnail(item: HttpTypes.StoreOrderLineItem): string | undefined {
  const li = item as LineItemLike;
  const t = item.thumbnail || li.variant?.product?.thumbnail;
  if (typeof t === 'string' && t.length > 0) return t;
  return undefined;
}

/** Medusa often returns `/static/...` paths — make them usable in `<img src>`. */
export function resolveMedusaContentUrl(path: string | undefined | null): string | undefined {
  if (path == null || typeof path !== 'string') return undefined;
  const t = path.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const base = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
  if (!base) return t;
  return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}

export function orderPrimaryLinePreview(order: HttpTypes.StoreOrder): {
  thumbnail: string | undefined;
  primaryTitle: string;
  extraCount: number;
} {
  const items = order.items;
  if (!items?.length) {
    return { thumbnail: undefined, primaryTitle: 'Your selection', extraCount: 0 };
  }
  const first = items[0];
  const rawThumb = lineItemThumbnail(first);
  return {
    thumbnail: resolveMedusaContentUrl(rawThumb),
    primaryTitle: lineItemTitle(first),
    extraCount: Math.max(0, items.length - 1),
  };
}

/** Paid orders still being prepared (shown in “atelier” strip). */
export function isOrderInPreShipmentAtelier(order: HttpTypes.StoreOrder): boolean {
  const p = (order.payment_status ?? '').toLowerCase();
  const paid = p === 'captured' || p === 'authorized';
  if (!paid) return false;
  const f = (order.fulfillment_status ?? '').toLowerCase();
  if (f === 'canceled' || f === 'delivered' || f === 'shipped') return false;
  return f === 'not_fulfilled' || f === 'partially_fulfilled' || f === '';
}

export function orderShipmentStatePresentation(order: HttpTypes.StoreOrder): {
  dotClass: string;
  label: string;
  labelClass: string;
} {
  const f = (order.fulfillment_status ?? '').toLowerCase();
  const p = (order.payment_status ?? '').toLowerCase();
  const paid = p === 'captured' || p === 'authorized';

  if (!paid) {
    return {
      dotClass: 'bg-amber-400',
      label: 'PAYMENT PENDING',
      labelClass: 'text-amber-200/90',
    };
  }
  if (f === 'delivered') {
    return {
      dotClass: 'bg-muted-foreground/45',
      label: 'DELIVERED',
      labelClass: 'text-muted-foreground',
    };
  }
  if (f === 'fulfilled' || f === 'shipped') {
    return {
      dotClass: 'bg-primary shadow-[0_0_10px_hsl(42_78%_52%/0.45)]',
      label: 'SHIPPED',
      labelClass: 'text-primary',
    };
  }
  if (f === 'partially_fulfilled') {
    return {
      dotClass: 'bg-amber-400',
      label: 'PARTIALLY SHIPPED',
      labelClass: 'text-amber-200/90',
    };
  }
  if (f === 'not_fulfilled' || !f) {
    return {
      dotClass: 'bg-primary/80',
      label: 'ORDER CONFIRMED',
      labelClass: 'text-primary',
    };
  }
  const fallback = fulfillmentStatusLabel(order.fulfillment_status).toUpperCase();
  return {
    dotClass: 'bg-muted-foreground/35',
    label: fallback,
    labelClass: 'text-muted-foreground',
  };
}

export async function listCustomerOrders(params: {
  limit: number;
  offset: number;
  /** Medusa list sort, e.g. `-created_at` for newest first. */
  order?: string;
}) {
  return medusa.store.order.list({
    limit: params.limit,
    offset: params.offset,
    order: params.order ?? '-created_at',
    fields: ORDER_LIST_FIELDS,
  });
}

export async function retrieveCustomerOrder(orderId: string) {
  return medusa.store.order.retrieve(orderId, { fields: ORDER_DETAIL_FIELDS });
}
