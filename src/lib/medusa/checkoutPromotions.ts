import { medusa, isMedusaConfigured } from '@/integrations/medusa/client';

/** Medusa application_method.target_type when exposed by the storefront route. */
export type CheckoutPromotionApplicationTarget = 'order' | 'items' | 'shipping_methods';

/** Row from GET /store/checkout-promotions (Medusa custom route). */
export type CheckoutPromotionCatalogItem = {
  id: string;
  code: string;
  display_code: string;
  title: string;
  subtitle: string;
  badge: string | null;
  is_automatic: boolean;
  promotion_type: string;
  sort_order: number;
  application_target: CheckoutPromotionApplicationTarget | null;
};

/** Coupon card model (catalog map). */
export type CheckoutPromotionDef = {
  id: string;
  code: string;
  displayCode?: string;
  title: string;
  subtitle: string;
  badge?: string;
  sortOrder: number;
  kind?: 'code' | 'automatic';
};

/** One applied promotion shown in checkout — only these appear in the main panel. */
export type AppliedCouponDisplay = {
  code: string;
  displayCode: string;
  title: string;
  subtitle: string;
  badge?: string;
  isAutomatic: boolean;
  applicationTarget: CheckoutPromotionApplicationTarget | 'unknown';
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x);
}

function parseCatalogItem(x: unknown): CheckoutPromotionCatalogItem | null {
  if (!isRecord(x)) return null;
  const id = typeof x.id === 'string' ? x.id.trim() : '';
  const code = typeof x.code === 'string' ? x.code.trim() : '';
  if (!id || !code) return null;
  return {
    id,
    code,
    display_code: typeof x.display_code === 'string' ? x.display_code : code,
    title: typeof x.title === 'string' ? x.title : code,
    subtitle: typeof x.subtitle === 'string' ? x.subtitle : '',
    badge:
      x.badge === null || x.badge === undefined
        ? null
        : typeof x.badge === 'string' && x.badge.trim()
          ? x.badge.trim()
          : null,
    is_automatic: x.is_automatic === true,
    promotion_type: typeof x.promotion_type === 'string' ? x.promotion_type : 'standard',
    sort_order: typeof x.sort_order === 'number' && Number.isFinite(x.sort_order) ? x.sort_order : 0,
    application_target:
      x.application_target === 'order' ||
      x.application_target === 'items' ||
      x.application_target === 'shipping_methods'
        ? x.application_target
        : null,
  };
}

async function parseFetchBody(resultUnknown: unknown): Promise<unknown> {
  if (!resultUnknown || typeof resultUnknown !== 'object') return null;
  if ('promotions' in resultUnknown) return resultUnknown;
  if (
    'json' in resultUnknown &&
    typeof (resultUnknown as Response).json === 'function'
  ) {
    try {
      return await (resultUnknown as Response).json();
    } catch {
      return null;
    }
  }
  return resultUnknown;
}

/**
 * Load promotion copy from the backend — enriches applied promos with Admin titles when available.
 * Pass `cartId` so the API returns only manual codes that currently produce a discount for that cart (Medusa computeActions).
 */
export async function fetchStoreCheckoutPromotions(
  cartId?: string | null,
): Promise<CheckoutPromotionCatalogItem[]> {
  if (!isMedusaConfigured()) return [];
  try {
    const q = cartId?.trim()
      ? `?cart_id=${encodeURIComponent(cartId.trim())}`
      : '';
    const raw = await medusa.client.fetch(`/store/checkout-promotions${q}`);
    const body = await parseFetchBody(raw);
    if (!isRecord(body)) return [];
    const promos = body.promotions;
    if (!Array.isArray(promos)) return [];
    const out: CheckoutPromotionCatalogItem[] = [];
    for (const p of promos) {
      const row = parseCatalogItem(p);
      if (row) out.push(row);
    }
    return out;
  } catch {
    return [];
  }
}

export function mapCatalogItemToDef(p: CheckoutPromotionCatalogItem): CheckoutPromotionDef {
  return {
    id: p.id,
    code: p.code,
    displayCode: p.display_code?.trim() || undefined,
    title: p.title,
    subtitle: p.subtitle,
    badge: p.badge?.trim() || undefined,
    sortOrder: p.sort_order,
    kind: p.is_automatic ? 'automatic' : 'code',
  };
}

export function offerCodeForDisplay(def: Pick<CheckoutPromotionDef, 'code' | 'displayCode'>): string {
  const d = def.displayCode?.trim();
  if (d) return d;
  const c = def.code.trim();
  if (!c) return '';
  return c.replace(/^AMB_DEMO_/i, '').replace(/_/g, ' ');
}

export function promotionCodeLabelForUi(rawCode: string): string {
  const t = rawCode.trim();
  if (!t) return '';
  const stripped = t.replace(/^AMB_DEMO_/i, '').trim();
  return stripped.replace(/_/g, ' ') || t;
}

/** Manual (non-automatic) promotion codes currently on the cart — snapshot before line-item resets. */
export function manualPromoCodesOnCart(cartPromotions: unknown[] | null | undefined): string[] {
  if (!Array.isArray(cartPromotions)) return [];
  const out: string[] = [];
  for (const raw of cartPromotions) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    if (p.is_automatic === true) continue;
    const c = typeof p.code === 'string' ? p.code.trim() : '';
    if (c) out.push(c);
  }
  return out;
}

/** Manual (non-automatic) promotion codes on the cart except one we are about to apply / keep. */
export function manualPromoCodesExcept(
  cartPromotions: unknown[] | null | undefined,
  exceptCodeUpper: string,
): string[] {
  if (!Array.isArray(cartPromotions)) return [];
  const u = exceptCodeUpper.trim().toUpperCase();
  const out: string[] = [];
  for (const raw of cartPromotions) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    if (p.is_automatic === true) continue;
    const c = typeof p.code === 'string' ? p.code.trim() : '';
    if (!c || c.toUpperCase() === u) continue;
    out.push(c);
  }
  return out;
}

/**
 * Horizontal picker: manual codes not on the cart, plus automatic promos that target **shipping**
 * (e.g. free delivery) so shoppers see them even though `computeActions` is empty before a shipping method exists.
 */
export function buildScrollableManualOffers(
  catalog: CheckoutPromotionCatalogItem[],
  appliedCodesUpper: Set<string>,
): CheckoutPromotionCatalogItem[] {
  return catalog
    .filter((p) => Boolean(p.code.trim()))
    .filter((p) => !appliedCodesUpper.has(p.code.trim().toUpperCase()))
    .filter((p) => {
      if (!p.is_automatic) return true;
      return p.application_target === 'shipping_methods';
    })
    .sort((a, b) =>
      a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.title.localeCompare(b.title),
    );
}

/**
 * Only promotions already attached to the Medusa cart. Copy is written for shoppers; catalog fills in
 * Admin marketing text when the code matches.
 */
export function buildAppliedCouponDisplays(
  cartPromotions: unknown[] | null | undefined,
  catalog: CheckoutPromotionCatalogItem[],
): AppliedCouponDisplay[] {
  if (!Array.isArray(cartPromotions) || cartPromotions.length === 0) return [];

  const byCode = new Map<string, CheckoutPromotionCatalogItem>();
  for (const item of catalog) {
    byCode.set(item.code.trim().toUpperCase(), item);
  }

  const out: AppliedCouponDisplay[] = [];

  for (const raw of cartPromotions) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const code = typeof p.code === 'string' ? p.code.trim() : '';
    if (!code) continue;

    const fromCartAuto = p.is_automatic === true;
    const match = byCode.get(code.toUpperCase());
    const def = match ? mapCatalogItemToDef(match) : null;
    const isAutomatic = fromCartAuto || match?.is_automatic === true;

    const displayCode = def
      ? offerCodeForDisplay({ code: def.code, displayCode: def.displayCode })
      : promotionCodeLabelForUi(code);

    const title = def?.title ?? (isAutomatic ? 'Automatic saving on this order' : 'Offer on this order');

    const subtitle = def?.subtitle?.trim()
      ? isAutomatic
        ? `${def.subtitle} We applied this for you when your bag qualified — you did not need to enter a code.`
        : `${def.subtitle} Savings show in your summary when every rule for this offer is satisfied.`
      : isAutomatic
        ? 'No code needed: your bag matched this promotion. If you change items or address, the saving may update before you pay.'
        : 'You applied this code to your bag. Your order summary shows the discount once rules, shipping, and taxes are final.';

    const applicationTarget: AppliedCouponDisplay['applicationTarget'] =
      match?.application_target ?? 'unknown';

    out.push({
      code,
      displayCode,
      title,
      subtitle,
      badge: def?.badge,
      isAutomatic,
      applicationTarget,
    });
  }

  out.sort((a, b) => {
    if (a.isAutomatic !== b.isAutomatic) return a.isAutomatic ? 1 : -1;
    return a.title.localeCompare(b.title);
  });

  return out;
}
