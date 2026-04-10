import { medusa, isMedusaConfigured } from '@/integrations/medusa/client';
import { manualPromoCodesExcept } from '@/lib/medusa/checkoutPromotions';
import { storefrontMajorPriceToMedusaMinor } from '@/lib/medusa/currency';
import { fetchMedusaProductById, getDefaultRegionId } from '@/lib/medusa/products';
import { useStore, cartItemLineKey, type CartItem, type Product } from '@/lib/store';
import { hamperSlotSelectionCharge } from '@/lib/hamper';

const CART_ID_STORAGE_KEY = 'amby-luxe-medusa-cart-id';

function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(CART_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredCartId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CART_ID_STORAGE_KEY, id);
    else localStorage.removeItem(CART_ID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isMedusaVariantId(id: string | undefined): id is string {
  return Boolean(id?.startsWith('variant_'));
}

let opChain = Promise.resolve();

function enqueueMedusaCartOp(fn: () => Promise<void>): void {
  opChain = opChain.then(fn).catch((err) => {
    console.error('[Medusa cart]', err);
  });
}

async function ensureMedusaCartId(): Promise<string | undefined> {
  if (!isMedusaConfigured()) return undefined;
  const regionId = await getDefaultRegionId();
  if (!regionId) return undefined;

  let cartId = getStoredCartId();
  if (cartId) {
    try {
      await medusa.store.cart.retrieve(cartId, { fields: 'id' });
      return cartId;
    } catch {
      setStoredCartId(null);
    }
  }

  const body: { region_id: string; sales_channel_id?: string } = { region_id: regionId };
  const sc = import.meta.env.VITE_MEDUSA_SALES_CHANNEL_ID?.trim();
  if (sc) body.sales_channel_id = sc;

  const { cart } = await medusa.store.cart.create(body, { fields: 'id' });
  const id = cart?.id;
  if (id) {
    setStoredCartId(id);
    return id;
  }
  return undefined;
}

type LineItemRow = {
  id?: string;
  variant_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function buildLineMetadata(item: CartItem): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (item.giftMessage?.trim()) out.gift_message = item.giftMessage.trim();
  if (item.hamperSelections && Object.keys(item.hamperSelections).length > 0) {
    out.hamper_bundle = 'true';
    out.hamper_selections = item.hamperSelections;
  }
  return out;
}

/**
 * Line metadata for Medusa, including `hamper_breakdown` (per-slot label, picked product, charge in minor units)
 * for Admin / packing slips. Fetches slot product prices from the Store API when possible.
 */
async function buildLineMetadataForMedusa(item: CartItem): Promise<Record<string, unknown>> {
  const base = buildLineMetadata(item);
  const bundle = item.product.hamperBundle;
  const sel = item.hamperSelections;
  if (!bundle?.slots?.length || !sel || !Object.keys(sel).length) return base;

  const idSet = new Set<string>();
  idSet.add(item.product.id);
  for (const s of Object.values(sel)) {
    if (s.productId?.startsWith('prod_')) idSet.add(s.productId);
  }
  const fetched = new Map<string, Product | undefined>();
  for (const id of idSet) {
    try {
      fetched.set(id, await fetchMedusaProductById(id));
    } catch {
      fetched.set(id, undefined);
    }
  }

  const freshParent = fetched.get(item.product.id);
  let baseMajor: number;
  let cc: string;
  if (freshParent) {
    const v = item.product.variantId
      ? freshParent.variants?.find((x) => x.id === item.product.variantId)
      : undefined;
    baseMajor = v?.price ?? freshParent.price;
    cc = v?.currencyCode ?? freshParent.currencyCode ?? 'inr';
  } else {
    let addon = 0;
    for (const slot of bundle.slots) {
      const s = sel[slot.id];
      if (!s?.productId) continue;
      const picked = fetched.get(s.productId);
      addon += hamperSlotSelectionCharge(slot, s, picked?.price);
    }
    baseMajor = Math.max(0, item.product.price - addon);
    cc = item.product.currencyCode ?? 'inr';
  }

  const rows: { slot_label: string; product_name: string; unit_minor: number }[] = [];
  for (const slot of bundle.slots) {
    const s = sel[slot.id];
    if (!s) continue;
    const picked = fetched.get(s.productId);
    const chargeMajor = hamperSlotSelectionCharge(slot, s, picked?.price);
    rows.push({
      slot_label: slot.label,
      product_name: s.productName || picked?.name || '—',
      unit_minor: storefrontMajorPriceToMedusaMinor(chargeMajor, cc),
    });
  }

  return {
    ...base,
    hamper_base_unit_minor: storefrontMajorPriceToMedusaMinor(baseMajor, cc),
    hamper_currency: cc,
    hamper_breakdown: rows,
  };
}

function metaSig(m: Record<string, unknown> | null | undefined): string {
  if (!m || typeof m !== 'object') return '{}';
  const o = m as Record<string, unknown>;
  return JSON.stringify({
    hamper_bundle: o.hamper_bundle ?? null,
    hamper_selections: o.hamper_selections ?? null,
    gift_message: o.gift_message ?? null,
  });
}

function lineItemMatchesCartItem(li: LineItemRow, item: CartItem): boolean {
  if (li.variant_id !== item.product.variantId) return false;
  return metaSig(li.metadata ?? undefined) === metaSig(buildLineMetadata(item));
}

/** Hamper / bundle lines include slot surcharges in storefront `product.price` only — Medusa variant price is base. */
function cartRowNeedsCustomMedusaUnitPrice(item: CartItem): boolean {
  return Boolean(item.hamperSelections && Object.keys(item.hamperSelections).length > 0);
}

async function cartFromLineItemFetchResult(
  resultUnknown: unknown,
): Promise<{ items?: LineItemRow[] } | null> {
  if (!resultUnknown || typeof resultUnknown !== 'object') return null;
  if ('cart' in resultUnknown) {
    return (resultUnknown as { cart: { items?: LineItemRow[] } | null }).cart ?? null;
  }
  if (
    'json' in resultUnknown &&
    typeof (resultUnknown as Response).json === 'function'
  ) {
    try {
      const j = await (resultUnknown as Response).json();
      if (j && typeof j === 'object' && 'cart' in j) {
        return (j as { cart: { items?: LineItemRow[] } }).cart ?? null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function findLineItemIdForCartItem(
  items: LineItemRow[] | null | undefined,
  item: CartItem,
): string | undefined {
  return items?.find((li) => lineItemMatchesCartItem(li, item))?.id;
}

function patchMedusaLineItemId(lineKey: string, medusaLineItemId: string): void {
  useStore.setState((state) => ({
    cart: state.cart.map((row) =>
      cartItemLineKey(row) === lineKey ? { ...row, medusaLineItemId } : row,
    ),
  }));
}

function clearMedusaLineItemId(lineKey: string): void {
  useStore.setState((state) => ({
    cart: state.cart.map((row) =>
      cartItemLineKey(row) === lineKey ? { ...row, medusaLineItemId: undefined } : row,
    ),
  }));
}

function isNotFoundCartLineError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  if (o.status === 404 || o.statusCode === 404) return true;
  const resp = o.response;
  if (resp && typeof resp === 'object' && (resp as { status?: number }).status === 404) {
    return true;
  }
  const msg = typeof o.message === 'string' ? o.message : '';
  return /\b404\b/.test(msg);
}

async function syncCartLineInternal(lineKey: string): Promise<void> {
  if (!isMedusaConfigured()) return;

  const item = useStore.getState().cart.find((i) => cartItemLineKey(i) === lineKey);
  if (!item) return;

  const variantId = item.product.variantId;
  if (!isMedusaVariantId(variantId)) return;

  const cartId = await ensureMedusaCartId();
  if (!cartId) return;

  const meta = await buildLineMetadataForMedusa(item);
  const metadataPayload = Object.keys(meta).length > 0 ? meta : undefined;

  if (cartRowNeedsCustomMedusaUnitPrice(item)) {
    const cartId = await ensureMedusaCartId();
    if (!cartId) return;

    if (item.medusaLineItemId) {
      try {
        await medusa.store.cart.deleteLineItem(cartId, item.medusaLineItemId);
      } catch {
        /* stale id */
      }
      clearMedusaLineItemId(lineKey);
    }

    const current = useStore.getState().cart.find((i) => cartItemLineKey(i) === lineKey);
    if (!current) return;
    const currentVariantId = current.product.variantId;
    if (!isMedusaVariantId(currentVariantId)) return;

    const metaCurrent = await buildLineMetadataForMedusa(current);
    const metadataPayloadCurrent = Object.keys(metaCurrent).length > 0 ? metaCurrent : undefined;

    const unitMinor = storefrontMajorPriceToMedusaMinor(
      current.product.price,
      current.product.currencyCode,
    );
    if (unitMinor <= 0) return;

    let resultUnknown: unknown;
    try {
      resultUnknown = await medusa.client.fetch(`/store/carts/${cartId}/line-items-custom`, {
        method: 'POST',
        body: {
          variant_id: currentVariantId,
          quantity: current.quantity,
          ...(metadataPayloadCurrent ? { metadata: metadataPayloadCurrent } : {}),
          unit_price: unitMinor,
        },
      });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Medusa cart] line-items-custom request failed', e);
      return;
    }

    const cartPayload = await cartFromLineItemFetchResult(resultUnknown);
    const lineItemId = findLineItemIdForCartItem(cartPayload?.items as LineItemRow[] | undefined, current);
    if (lineItemId) patchMedusaLineItemId(lineKey, lineItemId);
    return;
  }

  if (item.medusaLineItemId) {
    try {
      await medusa.store.cart.updateLineItem(cartId, item.medusaLineItemId, {
        quantity: item.quantity,
        ...(metadataPayload ? { metadata: metadataPayload } : {}),
      } as Parameters<typeof medusa.store.cart.updateLineItem>[2]);
      return;
    } catch (e) {
      if (!isNotFoundCartLineError(e)) throw e;
      clearMedusaLineItemId(lineKey);
    }
  }

  const current = useStore.getState().cart.find((i) => cartItemLineKey(i) === lineKey);
  if (!current) return;

  const metaCurrent = await buildLineMetadataForMedusa(current);
  const metadataPayloadCurrent = Object.keys(metaCurrent).length > 0 ? metaCurrent : undefined;
  const currentVariantId = current.product.variantId;
  if (!isMedusaVariantId(currentVariantId)) return;

  const { cart } = await medusa.store.cart.createLineItem(
    cartId,
    {
      variant_id: currentVariantId,
      quantity: current.quantity,
      ...(metadataPayloadCurrent ? { metadata: metadataPayloadCurrent } : {}),
    } as Parameters<typeof medusa.store.cart.createLineItem>[1],
    { fields: 'id,*items' },
  );

  const lineItemId = findLineItemIdForCartItem(cart?.items as LineItemRow[] | undefined, current);
  if (lineItemId) patchMedusaLineItemId(lineKey, lineItemId);
}

async function removeMedusaLineInternal(item: CartItem | undefined): Promise<void> {
  if (!item?.medusaLineItemId || !isMedusaConfigured()) return;
  const cartId = getStoredCartId();
  if (!cartId) return;
  try {
    await medusa.store.cart.deleteLineItem(cartId, item.medusaLineItemId);
  } catch {
    /* stale id / network */
  }
}

async function clearMedusaLinesInternal(items: CartItem[]): Promise<void> {
  if (!isMedusaConfigured()) return;
  const cartId = getStoredCartId();
  if (!cartId) return;
  for (const item of items) {
    if (item.medusaLineItemId) {
      try {
        await medusa.store.cart.deleteLineItem(cartId, item.medusaLineItemId);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Queue server cart update for one local line (variant qty / create line). */
export function scheduleSyncCartLine(lineKey: string): void {
  enqueueMedusaCartOp(() => syncCartLineInternal(lineKey));
}

export function scheduleRemoveMedusaLine(item: CartItem | undefined): void {
  enqueueMedusaCartOp(() => removeMedusaLineInternal(item));
}

export function scheduleClearMedusaCart(items: CartItem[]): void {
  enqueueMedusaCartOp(() => clearMedusaLinesInternal(items));
}

/** Medusa cart id for checkout integration (localStorage). */
export function getMedusaCartId(): string | null {
  return getStoredCartId();
}

/**
 * Remove every shipping method on the Medusa cart (e.g. after navigating away from a completed
 * delivery step or when checkout address is incomplete). Stops stale ₹ amounts from a prior session.
 */
export async function clearMedusaCartShippingMethods(): Promise<boolean> {
  if (!isMedusaConfigured()) return false;
  const cartId = getStoredCartId();
  if (!cartId) return false;
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId, {
      fields: 'id,*shipping_methods',
    });
    const methods = cart?.shipping_methods;
    if (!Array.isArray(methods) || methods.length === 0) return false;
    for (const m of methods) {
      const id =
        m && typeof m === 'object' && 'id' in m ? String((m as { id: string }).id) : '';
      if (!id) continue;
      await medusa.client.fetch(`/store/carts/${cartId}/shipping-methods/${id}`, {
        method: 'DELETE',
      });
    }
    return true;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Medusa cart] Could not clear shipping methods', e);
    return false;
  }
}

/** Clear stored Medusa cart id (e.g. after order completion). */
export function clearMedusaCartIdStorage(): void {
  setStoredCartId(null);
}

/**
 * Flush all local lines to the Medusa cart sequentially (used before checkout).
 * Skips lines without a Medusa `variant_*` id.
 */
export async function syncAllMedusaCartLinesNow(): Promise<void> {
  if (!isMedusaConfigured()) return;
  const keys = useStore.getState().cart.map((i) => cartItemLineKey(i));
  for (const key of keys) {
    await syncCartLineInternal(key);
  }
}

/**
 * Delete all Medusa cart line items and re-add from local cart so **unit_price** matches current
 * catalog prices. Updating quantity only does not refresh stale line prices — Razorpay then uses
 * the wrong payment total (e.g. ₹199 vs ₹10,000).
 */
export async function resetMedusaCartLinesFromLocalCart(): Promise<void> {
  if (!isMedusaConfigured()) return;
  const cartId = getStoredCartId();
  if (!cartId) return;
  const local = useStore.getState().cart;
  if (!local.length) return;

  const { cart: server } = await medusa.store.cart.retrieve(cartId, { fields: 'id,*items' });
  for (const li of server?.items ?? []) {
    if (li?.id) {
      try {
        await medusa.store.cart.deleteLineItem(cartId, li.id);
      } catch {
        /* stale line id */
      }
    }
  }
  useStore.setState((s) => ({
    cart: s.cart.map((i) => ({ ...i, medusaLineItemId: undefined })),
  }));
  for (const item of useStore.getState().cart) {
    await syncCartLineInternal(cartItemLineKey(item));
  }
}

/**
 * Re-attach manual promo codes after `resetMedusaCartLinesFromLocalCart()` (line deletes clear them).
 * Call after address + shipping are set so shipping-target promos can apply too.
 */
export async function reapplyManualPromotionsToCart(
  cartId: string,
  codes: string[],
): Promise<void> {
  if (!isMedusaConfigured() || !cartId.trim()) return;
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  for (const code of unique) {
    try {
      const { cart } = await medusa.store.cart.retrieve(cartId, { fields: '*promotions' });
      const otherManual = manualPromoCodesExcept(cart?.promotions, code.toUpperCase());
      for (const old of otherManual) {
        await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
          method: 'DELETE',
          body: { promo_codes: [old] },
        });
      }
      await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
        method: 'POST',
        body: { promo_codes: [code] },
      });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Medusa cart] Could not re-apply promotion', code, e);
    }
  }
}

/** Re-apply selected variant price from Medusa (fixes stale zustand prices after mapping / Admin changes). */
function productForCartLine(fresh: Product, variantId: string | undefined): Product {
  if (!variantId || !fresh.variants?.length) return fresh;
  const v = fresh.variants.find((x) => x.id === variantId);
  if (!v) return fresh;
  return {
    ...fresh,
    price: v.price,
    originalPrice: v.originalPrice,
    variantId: v.id,
    variantSku: v.sku,
    variantTitle: v.title,
    currencyCode: v.currencyCode,
  };
}

/**
 * Refresh line-item `product.price` from the Store API so the cart matches PDP after code or Admin updates.
 * Local cart is persisted; without this, old minor-unit prices stay until the user clears the cart.
 */
export async function refreshCartPricesFromMedusa(): Promise<void> {
  if (!isMedusaConfigured()) return;
  const cart = useStore.getState().cart;
  if (!cart.length) return;

  const selectedIds = cart.flatMap((i) =>
    i.hamperSelections
      ? Object.values(i.hamperSelections)
          .map((s) => s.productId)
          .filter((id) => Boolean(id) && id.startsWith("prod_"))
      : [],
  );
  const uniqueIds = [...new Set([...cart.map((i) => i.product.id), ...selectedIds])];
  const fetched = new Map<string, Product | undefined>();
  for (const id of uniqueIds) {
    try {
      fetched.set(id, await fetchMedusaProductById(id));
    } catch {
      fetched.set(id, undefined);
    }
  }

  const updated = cart.map((item) => {
    const fresh = fetched.get(item.product.id);
    if (!fresh) return item;
    const hamperAddOnTotal =
      item.hamperSelections && Object.keys(item.hamperSelections).length > 0
        ? Object.entries(item.hamperSelections).reduce((sum, [slotId, sel]) => {
            const slot = item.product.hamperBundle?.slots?.find((x) => x.id === slotId);
            if (!sel?.productId) return sum;
            if (!slot) return sum;
            const picked = fetched.get(sel.productId);
            return sum + hamperSlotSelectionCharge(slot, sel, picked?.price);
          }, 0)
        : 0;
    const base = productForCartLine(fresh, item.product.variantId);
    return {
      ...item,
      product: {
        ...base,
        price: base.price + hamperAddOnTotal,
      },
    };
  });

  useStore.setState({ cart: updated });
}
