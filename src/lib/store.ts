import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HamperBundleConfig, HamperSelectionMap } from '@/lib/hamper';

export type { HamperBundleConfig, HamperSelectionMap } from '@/lib/hamper';

/** Trust row on PDP — ids match Medusa metadata `icon` and lucide keys (kebab-case). */
export const TRUST_BADGE_ICON_IDS = [
  'truck',
  'shield',
  'rotate-ccw',
  'gift',
  'heart',
  'award',
  'gem',
  'sparkles',
  'package',
  'badge-check',
  'ribbon',
  'clock',
  'map-pin',
  'star',
  'medal',
] as const;

export type TrustBadgeIcon = (typeof TRUST_BADGE_ICON_IDS)[number];

export interface TrustBadgeItem {
  label: string;
  icon?: TrustBadgeIcon;
}

/** Product-level option (Medusa) — drives PDP variant pickers. */
export interface ProductOptionGroup {
  id: string;
  title: string;
  values: { id: string; value: string }[];
}

/** One purchasable variant with resolved storefront price. */
export interface StorefrontProductVariant {
  id: string;
  title: string | null;
  sku: string | null;
  price: number;
  originalPrice?: number;
  currencyCode: string;
  /** Medusa option id → option value id for this variant */
  optionValueByOptionId: Record<string, string>;
  inventoryQuantity?: number | null;
  manageInventory?: boolean | null;
  allowBackorder?: boolean | null;
  thumbnail?: string | null;
  /** Variant-specific gallery from Medusa (Store API `variants.images`). */
  imageUrls?: string[];
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  originCountry?: string | null;
  material?: string | null;
}

export interface Product {
  id: string;
  /** Medusa URL handle — used for `/products/{handle}` when set. */
  handle?: string;
  name: string;
  price: number;
  originalPrice?: number;
  /** ISO currency code from Medusa (e.g. EUR, INR). Used by formatPrice. */
  currencyCode?: string;
  /** Default / selected Medusa variant (first variant on list cards). */
  variantId?: string;
  variantSku?: string | null;
  variantTitle?: string | null;
  /** When present, PDP shows option UI and picks among `variants`. */
  optionGroups?: ProductOptionGroup[];
  variants?: StorefrontProductVariant[];
  image: string;
  images?: string[];
  /** First product category name (display). */
  category: string;
  /** Medusa category handle — aligns with `/shop?category=` and `/categories/{handle}`. */
  categoryHandle?: string;
  categoryId?: string;
  /** Product collection title from Medusa */
  collection?: string;
  /** Collection handle for `/shop?collection=` filters */
  collectionHandle?: string;
  collectionId?: string;
  /** Short line above title — set via Medusa Admin → Product → Metadata `tagline` */
  tagline?: string;
  /**
   * Extra search phrases from Medusa metadata `storefront_search` (comma / newline / JSON list).
   * Update anytime in Admin — indexed with the live product, not hardcoded in the app.
   */
  searchKeywords?: string[];
  description: string;
  /** Bullet points — Metadata `details` (JSON array or newline-separated text) */
  details?: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  /** Homepage / PDP curated strip — Metadata `featured` + `featured_order` */
  featured?: boolean;
  featuredRank?: number;
  /** Metadata `trust_badges` JSON array of `{ "label", "icon" }` */
  trustBadges?: TrustBadgeItem[];
  /** Gift hamper: customizable slots (metadata `hamper_bundle` JSON). */
  hamperBundle?: HamperBundleConfig;
  /** When true: hide from shop listing; sold only as hamper slot picks (metadata `only_in_hamper`). */
  onlyInHamper?: boolean;
  /** Product-level physical attributes (Medusa). Variants inherit these in the PDP when unset on the variant. */
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  originCountry?: string | null;
  material?: string | null;
}

/** Stable cart row id: product + variant when `variantId` is set. */
export function cartLineKey(product: Pick<Product, 'id' | 'variantId'>): string {
  return product.variantId ? `${product.id}::${product.variantId}` : product.id;
}

/** Cart row key including hamper slot picks (same parent + same picks = one line). */
export function cartItemLineKey(
  item: Pick<CartItem, 'product' | 'hamperSelections'>,
): string {
  const base = cartLineKey(item.product);
  const hs = item.hamperSelections;
  if (!hs || Object.keys(hs).length === 0) return base;
  const tail = Object.keys(hs)
    .sort()
    .map((k) => {
      const s = hs[k];
      if (!s) return `${k}:`;
      return `${k}:${s.productId}:${s.variantId}`;
    })
    .join('|');
  return `${base}::hamper::${tail}`;
}

export interface CartItem {
  product: Product;
  quantity: number;
  /** Medusa Store cart line id — set after sync when Medusa is configured. */
  medusaLineItemId?: string;
  /** Per-slot variant picks for gift hamper bundles. */
  hamperSelections?: HamperSelectionMap;
  /** Optional note printed / forwarded with the hamper line. */
  giftMessage?: string;
}

export interface WishlistItem {
  product: Product;
}

interface StoreState {
  cart: CartItem[];
  wishlist: WishlistItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    extra?: { hamperSelections?: HamperSelectionMap; giftMessage?: string },
  ) => void;
  /** Pass `cartItemLineKey(item)` from the cart row you want to remove. */
  removeFromCart: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  isInCart: (
    product: Pick<Product, 'id' | 'variantId'>,
    options?: { hamperSelections?: HamperSelectionMap },
  ) => boolean;
  cartQuantityForProduct: (
    product: Pick<Product, 'id' | 'variantId'>,
    options?: { hamperSelections?: HamperSelectionMap },
  ) => number;
  /** Any cart row for this parent product already has hamper picks (for grid CTAs). */
  hasConfiguredHamperInCart: (productId: string) => boolean;
  cartTotal: () => number;
  cartCount: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      
      addToCart: (product, quantity = 1, extra) => {
        const hamperSelections =
          extra?.hamperSelections && Object.keys(extra.hamperSelections).length > 0
            ? extra.hamperSelections
            : undefined;
        const giftMessage = extra?.giftMessage?.trim() || undefined;
        const draft: CartItem = { product, quantity: 1, hamperSelections, giftMessage };
        const key = cartItemLineKey(draft);
        set((state) => {
          const existingItem = state.cart.find((item) => cartItemLineKey(item) === key);
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                cartItemLineKey(item) === key
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      ...(giftMessage ? { giftMessage } : {}),
                    }
                  : item,
              ),
            };
          }
          return { cart: [...state.cart, { product, quantity, hamperSelections, giftMessage }] };
        });
        void import('@/lib/medusa/cartSync').then((m) => m.scheduleSyncCartLine(key));
      },

      removeFromCart: (lineKey) => {
        const removed = get().cart.find((item) => cartItemLineKey(item) === lineKey);
        set((state) => ({
          cart: state.cart.filter((item) => cartItemLineKey(item) !== lineKey),
        }));
        void import('@/lib/medusa/cartSync').then((m) => m.scheduleRemoveMedusaLine(removed));
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(lineKey);
          return;
        }
        set((state) => ({
          cart: state.cart.map((item) =>
            cartItemLineKey(item) === lineKey ? { ...item, quantity } : item,
          ),
        }));
        void import('@/lib/medusa/cartSync').then((m) => m.scheduleSyncCartLine(lineKey));
      },
      
      clearCart: () => {
        const snapshot = get().cart;
        set({ cart: [] });
        void import('@/lib/medusa/cartSync').then((m) => m.scheduleClearMedusaCart(snapshot));
      },
      
      addToWishlist: (product) => {
        set((state) => {
          if (state.wishlist.find(item => item.product.id === product.id)) {
            return state;
          }
          return { wishlist: [...state.wishlist, { product }] };
        });
      },
      
      removeFromWishlist: (productId) => {
        set((state) => ({
          wishlist: state.wishlist.filter(item => item.product.id !== productId),
        }));
      },
      
      isInWishlist: (productId) => {
        return get().wishlist.some(item => item.product.id === productId);
      },

      isInCart: (product, options) => {
        const hs = options?.hamperSelections;
        if (hs && Object.keys(hs).length > 0) {
          const probe: CartItem = { product, quantity: 1, hamperSelections: hs };
          const key = cartItemLineKey(probe);
          return get().cart.some((item) => cartItemLineKey(item) === key);
        }
        const pk = cartLineKey(product);
        return get().cart.some(
          (item) =>
            cartLineKey(item.product) === pk &&
            (!item.hamperSelections || Object.keys(item.hamperSelections).length === 0),
        );
      },

      cartQuantityForProduct: (product, options) => {
        const hs = options?.hamperSelections;
        if (hs && Object.keys(hs).length > 0) {
          const probe: CartItem = { product, quantity: 1, hamperSelections: hs };
          const key = cartItemLineKey(probe);
          return get().cart.find((item) => cartItemLineKey(item) === key)?.quantity ?? 0;
        }
        const pk = cartLineKey(product);
        return (
          get().cart.find(
            (item) =>
              cartLineKey(item.product) === pk &&
              (!item.hamperSelections || Object.keys(item.hamperSelections).length === 0),
          )?.quantity ?? 0
        );
      },

      hasConfiguredHamperInCart: (productId) =>
        get().cart.some(
          (item) =>
            item.product.id === productId &&
            item.hamperSelections &&
            Object.keys(item.hamperSelections).length > 0,
        ),

      cartTotal: () => {
        return get().cart.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
      
      cartCount: () => {
        return get().cart.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'amby-luxe-store',
    }
  )
);
