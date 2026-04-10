import type {
  Product,
  ProductOptionGroup,
  StorefrontProductVariant,
  TrustBadgeItem,
  TrustBadgeIcon,
} from '@/lib/store';
import { TRUST_BADGE_ICON_IDS } from '@/lib/store';
import { medusa } from '@/integrations/medusa/client';
import { slugifyProductSegment } from '@/lib/productUrl';
import { inrStoreAmountToDisplayRupees, medusaMinorToMajor } from '@/lib/medusa/currency';
import { compareAtPriceFromMeta } from '@/lib/medusa/compareAtMeta';
import {
  isOnlyInHamperFromMetadata,
  parseHamperBundleFromMetadata,
} from '@/lib/hamper';

const PRODUCT_FIELDS =
  '+handle,+title,*variants.calculated_price,+variants.calculated_price,*variants.prices,+variants.inventory_quantity,*variants.options,*variants.images,+variants.weight,+variants.width,+variants.length,+variants.height,+variants.origin_country,+variants.material,+weight,+width,+length,+height,+origin_country,+material,*options,*options.values,*images,*categories,*collection,+metadata';

const STORE_PRODUCT_PAGE_SIZE = 100;
/** Safety cap: ~5k products before we stop paging the Store API. */
const STORE_PRODUCT_MAX_PAGES = 50;

/**
 * Admin: Product → Metadata (key/value). Used by the storefront for luxury PDP + featured strip.
 *
 * | Key | Example | Purpose |
 * |-----|---------|---------|
 * | `tagline` | `Timeless` | Small caps line above title (overrides category for display) |
 * | `details` | `["Line 1","Line 2"]` or `Line 1\nLine 2` | Bullet list under description |
 * | `is_new` | `true` | NEW badge |
 * | `is_bestseller` | `true` | Sorting + fallback featured |
 * | `featured` | `true` | Show in homepage “Curated” + PDP suggested strip |
 * | `featured_order` | `1` | Sort order (lower first) |
 * | `compare_at_price` | `320000` | MRP / strikethrough in **rupees** (major). Product metadata = default for all variants; **variant** metadata same key overrides per SKU. |
 * | `trust_badges` | `[{"label":"Free Shipping","icon":"truck"}]` | PDP trust row (max 3 recommended) |
 * | `hamper_bundle` | JSON: `{ "slots": [{ "id","label","product_ids":[] }] }` | Gift hamper PDP — pick components per slot |
 * | `only_in_hamper` | `true` | Hide product from shop; only selectable inside hamper slots |
 */

/** Resolve region: optional `VITE_MEDUSA_REGION_ID`, else match `VITE_MEDUSA_DEFAULT_CURRENCY`, else first region. */
export async function getDefaultRegionId(): Promise<string | undefined> {
  const forced = import.meta.env.VITE_MEDUSA_REGION_ID?.trim();
  if (forced) return forced;

  const { regions } = await medusa.store.region.list({ limit: 50 });
  const want = import.meta.env.VITE_MEDUSA_DEFAULT_CURRENCY?.trim().toLowerCase();
  if (want && regions?.length) {
    const match = regions.find((r) => (r as { currency_code?: string }).currency_code?.toLowerCase() === want);
    if (match) return match.id;
  }
  return regions?.[0]?.id;
}

/**
 * Medusa stores money in the **smallest currency unit** (paise for INR, cents for USD/EUR).
 * `variants.calculated_price.calculated_amount` matches cart/order `unit_price` — convert to
 * **major** units before `formatPrice` / cart line math so the UI matches Razorpay and Medusa.
 * Metadata `compare_at_price` is **MRP in rupees**; it also helps `inrStoreAmountToDisplayRupees`
 * detect when the API amount was saved as rupees instead of paise (optional heuristic).
 */

function parseDetails(meta: Record<string, unknown> | null | undefined): string[] | undefined {
  if (!meta) return undefined;
  const raw = meta.details;
  if (Array.isArray(raw)) {
    const lines = raw.map(String).map((s) => s.trim()).filter(Boolean);
    return lines.length ? lines : undefined;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[')) {
      try {
        const j = JSON.parse(s) as unknown;
        if (Array.isArray(j)) {
          const lines = j.map(String).map((x) => x.trim()).filter(Boolean);
          return lines.length ? lines : undefined;
        }
      } catch {
        /* fall through */
      }
    }
    const lines = s.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    return lines.length ? lines : undefined;
  }
  return undefined;
}

const TRUST_ICON_SET = new Set<string>(TRUST_BADGE_ICON_IDS);

function parseTrustIcon(raw: unknown): TrustBadgeIcon | undefined {
  if (typeof raw !== 'string') return undefined;
  return TRUST_ICON_SET.has(raw) ? (raw as TrustBadgeIcon) : undefined;
}

/** Admin metadata: extra phrases shoppers may type (synonyms, Hindi, campaigns). */
function parseStorefrontSearchKeywords(
  meta: Record<string, unknown> | null | undefined,
): string[] | undefined {
  if (!meta) return undefined;
  const raw = meta.storefront_search ?? meta.search_keywords;
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const lines = raw.map(String).map((s) => s.trim()).filter(Boolean);
    return lines.length ? lines : undefined;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return undefined;
    if (s.startsWith('[')) {
      try {
        const j = JSON.parse(s) as unknown;
        if (Array.isArray(j)) {
          const lines = j.map(String).map((x) => x.trim()).filter(Boolean);
          return lines.length ? lines : undefined;
        }
      } catch {
        /* fall through */
      }
    }
    const lines = s.split(/[,;\n]+/).map((l) => l.trim()).filter(Boolean);
    return lines.length ? lines : undefined;
  }
  return undefined;
}

function parseTrustBadges(meta: Record<string, unknown> | null | undefined): TrustBadgeItem[] | undefined {
  if (!meta) return undefined;
  const raw = meta.trust_badges;
  let arr: unknown[] | null = null;
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) arr = j;
    } catch {
      return undefined;
    }
  }
  if (!arr?.length) return undefined;
  const out: TrustBadgeItem[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.label !== 'string' || !o.label.trim()) continue;
    out.push({
      label: o.label.trim(),
      icon: parseTrustIcon(o.icon),
    });
  }
  return out.length ? out.slice(0, 5) : undefined;
}

function truthyMeta(v: unknown): boolean {
  return v === true || v === 'true' || v === '1';
}

function numMeta(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

export { compareAtPriceFromMeta } from '@/lib/medusa/compareAtMeta';

type MedusaStoreVariant = {
  id: string;
  title?: string | null;
  sku?: string | null;
  thumbnail?: string | null;
  images?: Array<{ url?: string | null }> | null;
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  origin_country?: string | null;
  material?: string | null;
  calculated_price?: { calculated_amount?: number; original_amount?: number; currency_code?: string };
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_quantity?: number | null;
  options?: Array<{ id: string; value: string; option_id?: string | null }>;
  metadata?: Record<string, unknown> | null;
};

type MedusaStoreOption = {
  id: string;
  title: string;
  values?: Array<{ id: string; value: string }>;
};

/** Product-level physical fields; variants use these when their own fields are unset (Medusa Admin “inherit”). */
type ProductPhysicalFromApi = {
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  origin_country?: string | null;
  material?: string | null;
};

function mergeVariantPhysical(
  v: MedusaStoreVariant,
  product: ProductPhysicalFromApi,
): Pick<
  StorefrontProductVariant,
  'weight' | 'width' | 'length' | 'height' | 'originCountry' | 'material'
> {
  const str = (a: string | null | undefined, b: string | null | undefined) => {
    const x = a?.trim();
    if (x) return x;
    const y = b?.trim();
    return y || null;
  };
  return {
    weight: v.weight ?? product.weight ?? null,
    width: v.width ?? product.width ?? null,
    length: v.length ?? product.length ?? null,
    height: v.height ?? product.height ?? null,
    originCountry: str(v.origin_country, product.origin_country),
    material: str(v.material, product.material),
  };
}

function storefrontVariantFromMedusa(
  v: MedusaStoreVariant,
  meta: Record<string, unknown> | null | undefined,
  fallbackCurrency: string,
  productPhysical: ProductPhysicalFromApi,
): StorefrontProductVariant {
  const calc = v.calculated_price;
  const currencyCode = (calc?.currency_code ?? fallbackCurrency).toUpperCase();
  const rawAmount =
    calc?.calculated_amount != null && !Number.isNaN(calc.calculated_amount)
      ? calc.calculated_amount
      : 0;
  const variantCompareAt = compareAtPriceFromMeta(v.metadata ?? null);
  const productCompareAt = compareAtPriceFromMeta(meta ?? null);
  const manual = variantCompareAt ?? productCompareAt;

  const price =
    currencyCode === 'INR'
      ? inrStoreAmountToDisplayRupees(rawAmount, manual ?? undefined)
      : medusaMinorToMajor(rawAmount, currencyCode);
  const rawOriginal =
    calc?.original_amount != null && !Number.isNaN(calc.original_amount) ? calc.original_amount : 0;
  const fromCalc = rawOriginal
    ? currencyCode === 'INR'
      ? inrStoreAmountToDisplayRupees(rawOriginal, manual ?? undefined)
      : medusaMinorToMajor(rawOriginal, currencyCode)
    : 0;
  let originalPrice: number | undefined;
  if (fromCalc > price) originalPrice = fromCalc;
  else if (manual != null && manual > price) originalPrice = manual;

  const optionValueByOptionId: Record<string, string> = {};
  for (const o of v.options ?? []) {
    const oid = o.option_id;
    if (oid) optionValueByOptionId[oid] = o.id;
  }

  const imageUrls = (v.images ?? [])
    .map((img) => img.url)
    .filter((u): u is string => Boolean(u && String(u).trim()));

  return {
    id: v.id,
    title: v.title ?? null,
    sku: v.sku ?? null,
    price,
    originalPrice,
    currencyCode,
    optionValueByOptionId,
    inventoryQuantity: v.inventory_quantity,
    manageInventory: v.manage_inventory,
    allowBackorder: v.allow_backorder,
    thumbnail: v.thumbnail ?? null,
    imageUrls: imageUrls.length ? imageUrls : undefined,
    ...mergeVariantPhysical(v, productPhysical),
  };
}

/**
 * Map Medusa Store API product → storefront `Product` shape.
 */
export function mapMedusaProduct(p: {
  id: string;
  handle?: string | null;
  title?: string;
  description?: string | null;
  thumbnail?: string | null;
  images?: { url?: string | null }[];
  categories?: { id?: string; name?: string | null; handle?: string | null }[];
  collection?: { id?: string; title?: string | null; handle?: string | null } | null;
  metadata?: Record<string, unknown> | null;
  options?: MedusaStoreOption[] | null;
  variants?: MedusaStoreVariant[] | null;
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  origin_country?: string | null;
  material?: string | null;
}): Product {
  const meta = p.metadata ?? undefined;
  const fallbackCurrency =
    p.variants?.[0]?.calculated_price?.currency_code?.toUpperCase() ?? 'EUR';

  const productPhysical: ProductPhysicalFromApi = {
    weight: p.weight,
    width: p.width,
    length: p.length,
    height: p.height,
    origin_country: p.origin_country,
    material: p.material,
  };

  const variants = (p.variants ?? [])
    .filter((x) => x?.id)
    .map((v) =>
      storefrontVariantFromMedusa(v, meta ?? null, fallbackCurrency, productPhysical),
    );

  const defaultVariant = variants[0];
  const price = defaultVariant?.price ?? 0;
  const originalPrice = defaultVariant?.originalPrice;
  const currency = defaultVariant?.currencyCode ?? fallbackCurrency;

  const optionGroups: ProductOptionGroup[] | undefined =
    p.options?.length ?
      p.options.map((opt) => ({
        id: opt.id,
        title: opt.title,
        values: (opt.values ?? []).map((val) => ({ id: val.id, value: val.value })),
      }))
    : undefined;

  const imgs = p.images?.map((i) => i.url).filter(Boolean) as string[] | undefined;
  const thumb = p.thumbnail ?? imgs?.[0] ?? '/placeholder.svg';

  const firstCat = p.categories?.[0];
  const cat = firstCat?.name?.trim() || 'General';
  const catHandleRaw = firstCat?.handle?.trim();
  const categoryHandle = catHandleRaw || slugifyProductSegment(cat);
  const categoryId = firstCat?.id;
  const tagline = typeof meta?.tagline === 'string' ? meta.tagline.trim() : undefined;
  const searchKeywords = parseStorefrontSearchKeywords(meta ?? null);
  const featured = truthyMeta(meta?.featured);
  const featuredRank = featured
    ? (numMeta(meta?.featured_order ?? meta?.featured_rank) ?? 999)
    : 999;

  const hamperBundle = parseHamperBundleFromMetadata(meta);
  const onlyInHamper = isOnlyInHamperFromMetadata(meta);

  const rawHandle = typeof p.handle === 'string' ? p.handle.trim() : '';
  return {
    id: p.id,
    handle: rawHandle || undefined,
    name: p.title ?? 'Untitled',
    price,
    originalPrice,
    currencyCode: currency,
    variantId: defaultVariant?.id,
    variantSku: defaultVariant?.sku ?? null,
    variantTitle: defaultVariant?.title ?? null,
    optionGroups: optionGroups?.length ? optionGroups : undefined,
    variants: variants.length ? variants : undefined,
    image: thumb,
    images: imgs?.length ? imgs : [thumb],
    category: cat,
    categoryHandle: categoryHandle || undefined,
    categoryId: categoryId || undefined,
    collection: p.collection?.title ?? undefined,
    collectionHandle: p.collection?.handle ?? undefined,
    collectionId: p.collection?.id,
    tagline: tagline || undefined,
    searchKeywords: searchKeywords?.length ? searchKeywords : undefined,
    description: p.description ?? '',
    details: parseDetails(meta ?? null),
    isNew: truthyMeta(meta?.is_new),
    isBestseller: truthyMeta(meta?.is_bestseller),
    featured,
    featuredRank,
    trustBadges: parseTrustBadges(meta ?? null),
    hamperBundle,
    onlyInHamper: onlyInHamper || undefined,
    weight: p.weight ?? null,
    width: p.width ?? null,
    length: p.length ?? null,
    height: p.height ?? null,
    originCountry: p.origin_country ?? null,
    material: p.material ?? null,
  };
}

type MedusaStoreProductRow = Parameters<typeof mapMedusaProduct>[0];

async function listMedusaProductPage(
  regionId: string | undefined,
  offset: number,
): Promise<MedusaStoreProductRow[]> {
  const { products } = await medusa.store.product.list({
    limit: STORE_PRODUCT_PAGE_SIZE,
    offset,
    region_id: regionId,
    fields: PRODUCT_FIELDS,
  });
  return (products ?? []) as MedusaStoreProductRow[];
}

/** Full catalogue for shop / cache (paged; not limited to first 100). */
export async function fetchMedusaProducts(): Promise<Product[]> {
  const regionId = await getDefaultRegionId();
  const rows: MedusaStoreProductRow[] = [];
  for (let page = 0; page < STORE_PRODUCT_MAX_PAGES; page++) {
    const batch = await listMedusaProductPage(regionId, page * STORE_PRODUCT_PAGE_SIZE);
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < STORE_PRODUCT_PAGE_SIZE) break;
  }
  return rows.map((p) => mapMedusaProduct(p)).filter((p) => !p.onlyInHamper);
}

export async function fetchMedusaProductById(id: string): Promise<Product | undefined> {
  const regionId = await getDefaultRegionId();
  const { product } = await medusa.store.product.retrieve(id, {
    region_id: regionId,
    fields: PRODUCT_FIELDS,
  });
  if (!product) return undefined;
  return mapMedusaProduct(product as Parameters<typeof mapMedusaProduct>[0]);
}

function medusaProductRowMatchesHandle(
  row: { handle?: string | null },
  normalizedSlug: string,
  rawSegment: string,
): boolean {
  const h = (row.handle ?? '').trim();
  if (!h) return false;
  if (slugifyProductSegment(h) === normalizedSlug) return true;
  return h.toLowerCase() === rawSegment.trim().toLowerCase();
}

function medusaRowMatchesLookupSegment(
  row: MedusaStoreProductRow,
  normalizedSlug: string,
  rawSegment: string,
): boolean {
  if (medusaProductRowMatchesHandle(row, normalizedSlug, rawSegment)) return true;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  if (title && slugifyProductSegment(title) === normalizedSlug) return true;
  return false;
}

/**
 * PDP lookup: Medusa id (`prod_…`) or product handle (slug or human phrase).
 */
export async function fetchMedusaProductLookup(segment: string): Promise<Product | undefined> {
  const key = segment.trim();
  if (!key) return undefined;
  if (key.startsWith('prod_')) {
    return fetchMedusaProductById(key);
  }

  const regionId = await getDefaultRegionId();
  const normalized = slugifyProductSegment(key);

  const listArgs = {
    region_id: regionId,
    fields: PRODUCT_FIELDS,
    limit: 20,
    handle: normalized,
  };

  try {
    const { products } = await medusa.store.product.list(
      listArgs as Parameters<typeof medusa.store.product.list>[0],
    );
    for (const raw of products ?? []) {
      const row = raw as MedusaStoreProductRow;
      if (medusaRowMatchesLookupSegment(row, normalized, key)) {
        return mapMedusaProduct(row);
      }
    }
  } catch {
    /* fall through to paged scan */
  }

  for (let page = 0; page < STORE_PRODUCT_MAX_PAGES; page++) {
    const batch = await listMedusaProductPage(regionId, page * STORE_PRODUCT_PAGE_SIZE);
    if (!batch.length) break;
    for (const row of batch) {
      if (medusaRowMatchesLookupSegment(row, normalized, key)) {
        return mapMedusaProduct(row);
      }
    }
    if (batch.length < STORE_PRODUCT_PAGE_SIZE) break;
  }

  return undefined;
}
