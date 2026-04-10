import productBangles from '@/assets/product-bangles.jpg';
import productBracelet from '@/assets/product-bracelet.jpg';
import productPendant from '@/assets/product-pendant.jpg';
import { medusa } from '@/integrations/medusa/client';
import { collections as staticCatalogCollections, staticProducts } from '@/lib/products';
import { getDefaultRegionId } from '@/lib/medusa/products';

/** Display order on /collections and homepage (matches seed `sort_order`). */
const HANDLE_ORDER = ['timeless', 'heritage', 'celestial'] as const;

export type ShowcaseCollection = {
  /** Medusa collection id (`pcol_…`) when from API; same as handle for static fallback */
  medusaId: string;
  /** URL slug — use in `/shop?collection=<handle>` */
  handle: string;
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  image: string;
  itemCount: number;
};

function readMetaString(m: Record<string, unknown> | null | undefined, key: string): string {
  const v = m?.[key];
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

/** Unknown handles without sort_order used to default to 99 — any explicit 1–98 sorted *before* them, so e.g. 8 appeared first. Use a high default so explicit orders stay ahead. */
const UNKNOWN_COLLECTION_SORT_RANK = 10_000;

function sortOrderForHandle(handle: string, meta: Record<string, unknown> | null | undefined): number {
  const raw = readMetaString(meta, 'sort_order');
  if (raw !== '') {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
  }
  const idx = HANDLE_ORDER.indexOf(handle as (typeof HANDLE_ORDER)[number]);
  if (idx >= 0) return idx + 1;
  return UNKNOWN_COLLECTION_SORT_RANK;
}

/** When true, collection may appear in the homepage “Collections” strip (not only /collections). */
export function readStorefrontHome(meta: Record<string, unknown> | null | undefined): boolean {
  const v = meta?.storefront_home;
  return v === true || v === 'true' || v === '1' || v === 1;
}

function productCountFromCollection(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.length;
}

const LONG_COPY: Record<string, string> = {
  timeless:
    'Masterpieces that defy the passage of time. Each piece in our Timeless collection is designed to become an heirloom — a bridge between generations, carrying stories of love and legacy.',
  heritage:
    'Born from centuries of Indian royal craftsmanship, the Heritage collection honours tradition while embracing contemporary sophistication. Every piece tells the story of emperors and artisans.',
  celestial:
    'Inspired by the infinite beauty of the cosmos — the shimmer of distant stars, the glow of the moon, the aurora of twilight. The Celestial collection captures the ethereal in precious form.',
};

const TAGLINE: Record<string, string> = {
  timeless: 'Enduring Elegance',
  heritage: 'Royal Legacy',
  celestial: 'Cosmic Radiance',
};

const LOCAL_IMAGE: Record<string, string> = {
  timeless: productBracelet,
  heritage: productBangles,
  celestial: productPendant,
};

/** Public-folder jewellery shots — used when metadata URL is wrong or handle is unknown. */
export const SHOWCASE_FALLBACK_PUBLIC = '/images/products/product-bracelet.jpg' as const;

/**
 * Medusa often stores `hero_image` as an absolute URL (e.g. http://localhost:8080/...).
 * Rewrite to a same-origin path so images load when the storefront runs on another port.
 */
export function normalizeCollectionImageUrl(hero: string): string {
  const t = hero.trim();
  if (!t) return t;
  if (t.startsWith('/') && !t.startsWith('//')) return t;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:8080';
    const u = new URL(t, base);
    if (u.pathname.startsWith('/images/') || u.pathname === '/placeholder.svg') {
      return `${u.pathname}${u.search}`;
    }
    return t;
  } catch {
    return t;
  }
}

const MEDUSA_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MEDUSA_URL?.replace(/\/$/, '')) ||
  'http://localhost:9000';

/**
 * Uploaded files in Medusa are often `/static/...` relative to the API host.
 * The storefront must prefix `VITE_MEDUSA_URL` so `<img src>` resolves.
 */
export function resolveCollectionHeroUrl(hero: string): string {
  const normalized = normalizeCollectionImageUrl(hero);
  if (!normalized) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('/static/')) {
    return `${MEDUSA_BASE}${normalized}`;
  }
  return normalized;
}

function staticCountByCollectionTitle(title: string): number {
  return staticProducts.filter((p) => p.collection === title).length;
}

/** When Medusa is off or request fails — mirrors jewellery catalogue. */
export function getStaticShowcaseCollections(): ShowcaseCollection[] {
  const out: ShowcaseCollection[] = staticCatalogCollections.map((c) => {
    const handle = c.id;
    return {
      medusaId: handle,
      handle,
      name: c.name,
      tagline: TAGLINE[handle] ?? c.name,
      shortDescription: c.description,
      longDescription: LONG_COPY[handle] ?? c.description,
      image: LOCAL_IMAGE[handle] ?? (c.image as string),
      itemCount: staticCountByCollectionTitle(c.name) || 1,
    };
  });
  return out.sort(
    (a, b) =>
      HANDLE_ORDER.indexOf(a.handle as (typeof HANDLE_ORDER)[number]) -
      HANDLE_ORDER.indexOf(b.handle as (typeof HANDLE_ORDER)[number]),
  );
}

export function mapMedusaCollectionToShowcase(c: {
  id: string;
  title?: string | null;
  handle?: string | null;
  metadata?: Record<string, unknown> | null;
  products?: unknown;
}): ShowcaseCollection {
  const handle = (c.handle ?? '').trim() || c.id;
  const meta = c.metadata ?? undefined;
  const tagline =
    readMetaString(meta, 'storefront_tagline') || TAGLINE[handle] || c.title || handle;
  const shortDesc =
    readMetaString(meta, 'storefront_short') ||
    staticCatalogCollections.find((x) => x.id === handle)?.description ||
    '';
  const longDesc =
    readMetaString(meta, 'storefront_long') || LONG_COPY[handle] || shortDesc;
  const heroRaw = readMetaString(meta, 'hero_image');
  const heroResolved = heroRaw ? resolveCollectionHeroUrl(heroRaw) : '';
  const image =
    heroResolved ||
    LOCAL_IMAGE[handle] ||
    (staticCatalogCollections.find((x) => x.id === handle)?.image as string | undefined) ||
    SHOWCASE_FALLBACK_PUBLIC;

  return {
    medusaId: c.id,
    handle,
    name: c.title ?? handle,
    tagline,
    shortDescription: shortDesc,
    longDescription: longDesc,
    image,
    itemCount: productCountFromCollection(c.products),
  };
}

export type ShowcaseCollectionScope = 'all' | 'homepage';

type RawStoreCollection = {
  id: string;
  handle?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Custom Store route returns DB metadata; default `GET /store/collections` often strips metadata,
 * so storefront_short / storefront_long never appear on home or /collections.
 */
async function fetchShowcaseCollectionsWithMetadata(): Promise<RawStoreCollection[]> {
  const base = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
  const key = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? '';
  if (!base || !key) {
    throw new Error('Missing VITE_MEDUSA_URL or VITE_MEDUSA_PUBLISHABLE_KEY');
  }
  const res = await fetch(`${base}/store/showcase-collections`, {
    method: 'GET',
    headers: {
      'x-publishable-api-key': key,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`showcase-collections ${res.status}: ${text.slice(0, 240)}`);
  }
  const body = (await res.json()) as { collections?: RawStoreCollection[] };
  return body.collections ?? [];
}

/**
 * Load collections from Medusa Store API (metadata for copy; counts from product list).
 * `homepage`: only collections with metadata `storefront_home` true (with legacy fallback if none flagged).
 */
export async function fetchMedusaShowcaseCollections(
  scope: ShowcaseCollectionScope = 'all',
): Promise<ShowcaseCollection[]> {
  const regionId = await getDefaultRegionId();

  let list: RawStoreCollection[] = [];
  try {
    list = await fetchShowcaseCollectionsWithMetadata();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(
        '[Amby Luxe] /store/showcase-collections failed; descriptions/sort may be wrong. Run latest backend.',
        e,
      );
    }
    const { collections } = await medusa.store.collection.list({ limit: 100 });
    list = (collections ?? []) as RawStoreCollection[];
  }

  const { products } = await medusa.store.product.list({
    limit: 200,
    region_id: regionId,
    fields: 'id,*collection',
  });

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    const raw = p as { collection?: { id?: string } | null };
    const cid = raw.collection?.id;
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  const metaById = new Map<string, Record<string, unknown>>();
  for (const c of list) {
    const raw = c.metadata;
    metaById.set(c.id, raw && typeof raw === 'object' ? { ...raw } : {});
  }

  const mapped = list.map((c) => {
    const base = mapMedusaCollectionToShowcase(
      c as Parameters<typeof mapMedusaCollectionToShowcase>[0],
    );
    const n = counts.get(c.id);
    return {
      ...base,
      itemCount: n != null && n > 0 ? n : base.itemCount,
    };
  });

  const cmp = (a: ShowcaseCollection, b: ShowcaseCollection) => {
    const ma = metaById.get(a.medusaId);
    const mb = metaById.get(b.medusaId);
    const sa = sortOrderForHandle(a.handle, ma);
    const sb = sortOrderForHandle(b.handle, mb);
    if (sa !== sb) return sa - sb;
    return a.handle.localeCompare(b.handle);
  };

  mapped.sort(cmp);

  if (scope !== 'homepage') {
    return mapped;
  }

  const home = mapped.filter((row) => readStorefrontHome(metaById.get(row.medusaId)));
  if (home.length > 0) {
    return home;
  }

  if (import.meta.env.DEV) {
    console.warn(
      '[Amby Luxe] No collections have storefront_home=true — showing all collections on the homepage strip. Toggle “Show on homepage” in Medusa Admin for each collection you want.',
    );
  }
  return mapped;
}
