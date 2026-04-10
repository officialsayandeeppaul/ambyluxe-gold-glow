/**
 * Gift hamper bundles (Ajio-style): parent SKU sells a customizable pack;
 * component products can be marked not sold alone via `only_in_hamper` metadata.
 */

export type HamperSlotConfig = {
  id: string;
  label: string;
  description?: string;
  /** If true, shopper must choose one product in this section */
  required?: boolean;
  /** Optional fixed price added when shopper selects this section */
  sectionPrice?: number;
  /** Optional image URL shown above this section in the storefront picker */
  image?: string;
  /** Optional discount percentage per selected product id/handle in this slot */
  productDiscountPercents?: Record<string, number>;
  /** Medusa product ids/handles the buyer can pick for this slot */
  productIds: string[];
};

export type HamperBundleConfig = {
  slots: HamperSlotConfig[];
  allowGiftMessage?: boolean;
  giftMessageMaxLength?: number;
};

export type HamperSelectionMap = Record<
  string,
  {
    productId: string;
    variantId: string;
    productName: string;
    variantLabel?: string | null;
    /** Original slot key used when selecting (id or handle), useful for pricing map lookup */
    sourceKey?: string;
  }
>;

function readString(m: Record<string, unknown> | null | undefined, key: string): string {
  const v = m?.[key];
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function truthy(v: unknown): boolean {
  return v === true || v === 'true' || v === '1';
}

function parsePercentMap(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k.trim()) continue;
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.min(100, Math.max(0, v));
    else if (typeof v === 'string' && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = Math.min(100, Math.max(0, n));
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function parseOptionalBool(raw: unknown): boolean | undefined {
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
}

function parseOptionalAmount(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

/** Parse `metadata.hamper_bundle` (JSON string or object). */
export function parseHamperBundleFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): HamperBundleConfig | undefined {
  if (!meta) return undefined;
  const raw = meta.hamper_bundle;
  let obj: unknown = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  const slotsRaw = o.slots ?? o.slot;
  if (!Array.isArray(slotsRaw) || slotsRaw.length === 0) return undefined;
  const slots: HamperSlotConfig[] = [];
  for (const row of slotsRaw) {
    if (!row || typeof row !== 'object') continue;
    const s = row as Record<string, unknown>;
    const id = typeof s.id === 'string' ? s.id.trim() : '';
    const label = typeof s.label === 'string' ? s.label.trim() : '';
    let productIds: string[] = [];
    const pid = s.product_ids ?? s.productIds ?? s.product_handles ?? s.productHandles;
    if (Array.isArray(pid)) {
      productIds = pid.map((x) => String(x).trim()).filter(Boolean);
    } else if (typeof pid === 'string' && pid.trim()) {
      productIds = pid
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
    if (!id || !label) continue;
    slots.push({
      id,
      label,
      description: typeof s.description === 'string' ? s.description.trim() : undefined,
      required: parseOptionalBool(s.required ?? s.is_required) ?? false,
      sectionPrice: parseOptionalAmount(s.section_price ?? s.sectionPrice),
      image: typeof s.image === 'string' && s.image.trim() ? s.image.trim() : undefined,
      productDiscountPercents: parsePercentMap(
        s.product_discount_percents ?? s.productDiscountPercents,
      ),
      productIds,
    });
  }
  if (!slots.length) return undefined;
  const allowGiftMessage = truthy(o.allow_gift_message ?? o.allowGiftMessage);
  const gmax = o.gift_message_max_length ?? o.giftMessageMaxLength;
  const giftMessageMaxLength =
    typeof gmax === 'number' && gmax > 0 ? Math.min(2000, gmax) : allowGiftMessage ? 500 : undefined;
  return { slots, allowGiftMessage, giftMessageMaxLength };
}

export function isOnlyInHamperFromMetadata(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false;
  return truthy(meta.only_in_hamper ?? meta.onlyInHamper);
}

export function hamperSelectionsComplete(
  config: HamperBundleConfig,
  sel: HamperSelectionMap | undefined,
): boolean {
  if (!config.slots.length) return false;
  const requiredSlots = config.slots.filter((slot) => slot.productIds.length > 0 && slot.required);
  if (!requiredSlots.length) return true;
  if (!sel) return false;
  return requiredSlots.every((slot) => Boolean(sel[slot.id]?.variantId));
}

/** First variant of each product as default suggestion (PDP preselect). */
export function defaultHamperSelections(
  config: HamperBundleConfig,
  productById: Map<string, { id: string; name: string; variantId?: string; variantTitle?: string | null }>,
): HamperSelectionMap {
  const out: HamperSelectionMap = {};
  for (const slot of config.slots) {
    const firstPid = slot.productIds.find((id) => productById.has(id));
    if (!firstPid) continue;
    const p = productById.get(firstPid)!;
    if (!p.variantId) continue;
    out[slot.id] = {
      productId: p.id,
      variantId: p.variantId,
      productName: p.name,
      variantLabel: p.variantTitle ?? null,
      sourceKey: firstPid,
    };
  }
  return out;
}

export function hamperSlotSelectionDiscountPercent(
  slot: HamperSlotConfig,
  sel: { productId?: string; sourceKey?: string } | undefined,
): number {
  if (!sel?.productId) return 0;
  const map = slot.productDiscountPercents ?? {};
  const bySource = sel.sourceKey ? map[sel.sourceKey] : undefined;
  const byProductId = map[sel.productId];
  const pct = bySource ?? byProductId ?? 0;
  return Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
}

export function hamperSlotSelectionCharge(
  slot: HamperSlotConfig,
  sel: { productId?: string; sourceKey?: string } | undefined,
  selectedProductPrice: number | undefined,
): number {
  if (!sel?.productId) return 0;
  const sectionFixed = Math.max(0, slot.sectionPrice ?? 0);
  if (selectedProductPrice == null || !Number.isFinite(selectedProductPrice)) return sectionFixed;
  const discountPct = hamperSlotSelectionDiscountPercent(slot, sel);
  const multiplier = Math.max(0, 1 - discountPct / 100);
  return Math.max(0, selectedProductPrice * multiplier) + sectionFixed;
}
