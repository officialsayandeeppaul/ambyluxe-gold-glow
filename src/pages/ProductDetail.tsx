import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatPrice } from '@/lib/products';
import { useStore } from '@/lib/store';
import type { Product, StorefrontProductVariant, TrustBadgeIcon, TrustBadgeItem } from '@/lib/store';
import { useProduct, useFeaturedProducts } from '@/hooks/useProducts';
import {
  Heart,
  Minus,
  Plus,
  ChevronLeft,
  Check,
  Truck,
  Shield,
  RotateCcw,
  Gift,
  Award,
  Gem,
  Sparkles,
  Package,
  BadgeCheck,
  Ribbon,
  Clock,
  MapPin,
  Star,
  Medal,
  type LucideIcon,
} from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { productPath } from '@/lib/productUrl';
import { productsShareCategory } from '@/lib/shopCategory';
import { HamperConfigurator } from '@/components/hamper/HamperConfigurator';
import type { HamperSelectionMap } from '@/lib/hamper';
import { hamperSlotSelectionCharge } from '@/lib/hamper';
import { hamperSelectionsComplete } from '@/lib/hamper';

const TRUST_ICONS: Record<TrustBadgeIcon, LucideIcon> = {
  truck: Truck,
  shield: Shield,
  'rotate-ccw': RotateCcw,
  gift: Gift,
  heart: Heart,
  award: Award,
  gem: Gem,
  sparkles: Sparkles,
  package: Package,
  'badge-check': BadgeCheck,
  ribbon: Ribbon,
  clock: Clock,
  'map-pin': MapPin,
  star: Star,
  medal: Medal,
};

const DEFAULT_TRUST: TrustBadgeItem[] = [
  { label: 'Free Shipping', icon: 'truck' },
  { label: 'Lifetime Warranty', icon: 'shield' },
  { label: '30-Day Returns', icon: 'rotate-ccw' },
];

/** Gallery: variant images → else variant thumbnail + product images → else product gallery. */
function galleryForVariant(v: StorefrontProductVariant | undefined, product: Product): string[] {
  const fallback = product.images?.length ? [...product.images] : [product.image];
  if (!v) return fallback;
  const urls = v.imageUrls?.filter((u) => u?.trim()) ?? [];
  if (urls.length) return urls;
  const thumb = v.thumbnail?.trim();
  if (thumb) {
    const rest = fallback.filter((u) => u !== thumb);
    return [thumb, ...rest];
  }
  return fallback;
}

type AttrRow = { label: string; value: string };

function hasNum(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

/**
 * PDP attributes: weight + dimensions + material. Medusa variants already inherit product
 * physical fields in `mapMedusaProduct`; `p` is a fallback for static / edge cases.
 */
function variantPhysicalAttributeRows(v: StorefrontProductVariant, p: Product): AttrRow[] {
  const rows: AttrRow[] = [];
  const numStr = (n: number | null | undefined) => (hasNum(n) ? String(n) : '');

  const add = (
    label: string,
    variantVal: number | null | undefined,
    productVal: number | null | undefined,
  ) => {
    const n = hasNum(variantVal) ? variantVal : productVal;
    if (hasNum(n)) rows.push({ label, value: numStr(n) });
  };

  add('Weight (g)', v.weight, p.weight);
  add('Length (cm)', v.length, p.length);
  add('Width (cm)', v.width, p.width);
  add('Height (cm)', v.height, p.height);

  const txt = (x: string | null | undefined) => (x?.trim() ? x.trim() : '');
  const mat = txt(v.material) || txt(p.material);
  if (mat) rows.push({ label: 'Material', value: mat });

  return rows;
}

const ProductDetail = () => {
  const params = useParams<{ id?: string; handle?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const rawSegment = params.handle ?? params.id;
  const { product, allProducts = [], isLoading } = useProduct(rawSegment);

  useEffect(() => {
    if (!product?.handle) return;
    if (!params.id?.startsWith('prod_')) return;
    if (!location.pathname.startsWith('/product/')) return;
    const canonical = productPath(product);
    if (location.pathname === canonical) return;
    navigate(canonical, { replace: true });
  }, [product, params.id, location.pathname, navigate]);
  const { data: curated = [] } = useFeaturedProducts(5);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectionByOptionId, setSelectionByOptionId] = useState<Record<string, string>>({});
  const [hamperSelections, setHamperSelections] = useState<HamperSelectionMap>({});
  const [giftMessage, setGiftMessage] = useState('');
  const [hamperSheetOpen, setHamperSheetOpen] = useState(false);
  const hamperSeedProductIdRef = useRef<string | null>(null);
  const {
    cart,
    addToCart,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    isInCart,
    cartQuantityForProduct,
  } = useStore();

  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0);
    setSelectionByOptionId({});
    setHamperSelections({});
    setGiftMessage('');
    setHamperSheetOpen(false);
    hamperSeedProductIdRef.current = null;
  }, [rawSegment]);

  useEffect(() => {
    if (!product) return;
    const groups = product.optionGroups;
    const vars = product.variants;
    if (!groups?.length || !vars?.length) return;
    const prefer = product.variantId;
    const v = vars.find((x) => x.id === prefer) ?? vars[0];
    setSelectionByOptionId({ ...v.optionValueByOptionId });
  }, [product?.id, product?.variantId]);

  const effectiveVariant = useMemo(() => {
    if (!product?.variants?.length) return undefined;
    const groups = product.optionGroups;
    if (!groups?.length) return product.variants[0];
    return (
      product.variants.find((variant) =>
        groups.every((g) => variant.optionValueByOptionId[g.id] === selectionByOptionId[g.id]),
      ) ?? product.variants[0]
    );
  }, [product, selectionByOptionId]);

  const maxQty = useMemo(() => {
    const v = effectiveVariant;
    if (!v?.manageInventory || v.inventoryQuantity == null || v.allowBackorder) return 99;
    return Math.max(1, v.inventoryQuantity);
  }, [effectiveVariant]);

  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQty));
  }, [maxQty]);

  useEffect(() => {
    setSelectedImage(0);
  }, [effectiveVariant?.id]);

  const displayPrice = effectiveVariant?.price ?? product?.price ?? 0;
  const displayOriginal = effectiveVariant?.originalPrice ?? product?.originalPrice;
  const displayCc = effectiveVariant?.currencyCode ?? product?.currencyCode;

  const outOfStock =
    effectiveVariant?.manageInventory === true &&
    effectiveVariant.allowBackorder !== true &&
    (effectiveVariant.inventoryQuantity ?? 0) <= 0;

  const pickOptionValue = (optionId: string, valueId: string) => {
    if (!product?.variants?.length) return;
    const candidates = product.variants.filter(
      (v) => v.optionValueByOptionId[optionId] === valueId,
    );
    const pick = candidates[0];
    if (pick) setSelectionByOptionId({ ...pick.optionValueByOptionId });
  };

  const hamperProductMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of allProducts) {
      m.set(p.id, p);
      if (p.handle?.trim()) m.set(p.handle.trim(), p);
    }
    return m;
  }, [allProducts]);

  useEffect(() => {
    if (!product?.id) return;
    if (hamperSeedProductIdRef.current !== product.id) {
      hamperSeedProductIdRef.current = product.id;
      setHamperSelections({});
    }
  }, [product?.id]);

  const suggestedProducts = useMemo(() => {
    if (!product) return [];
    const fromFeatured = curated.filter((p) => p.id !== product.id).slice(0, 5);
    if (fromFeatured.length >= 4) return fromFeatured;
    const sameCategory = allProducts.filter(
      (p) => p.id !== product.id && productsShareCategory(p, product),
    );
    const merged = [...fromFeatured];
    for (const p of sameCategory) {
      if (merged.length >= 5) break;
      if (!merged.find((m) => m.id === p.id)) merged.push(p);
    }
    return merged.slice(0, 5);
  }, [product, curated, allProducts]);

  const trustRow = product?.trustBadges?.length ? product.trustBadges : DEFAULT_TRUST;

  const displayImages = useMemo(() => {
    if (!product) return ['/placeholder.svg'];
    return galleryForVariant(effectiveVariant, product);
  }, [product, effectiveVariant]);

  const attributeRows =
    effectiveVariant ? variantPhysicalAttributeRows(effectiveVariant, product) : [];

  const cartLineProduct = useMemo((): Product | null => {
    if (!product) return null;
    const v = effectiveVariant ?? product.variants?.[0];
    const lineImage =
      v?.imageUrls?.[0] ?? (v?.thumbnail?.trim() ? v.thumbnail : undefined) ?? product.image;
    return {
      ...product,
      price: v?.price ?? product.price,
      originalPrice: v?.originalPrice ?? product.originalPrice,
      currencyCode: v?.currencyCode ?? product.currencyCode,
      variantId: v?.id ?? product.variantId,
      variantSku: v?.sku ?? product.variantSku,
      variantTitle: v?.title ?? product.variantTitle,
      image: lineImage,
    };
  }, [product, effectiveVariant]);

  const hamperMode = Boolean(product?.hamperBundle?.slots?.length);
  const inCartLine = cartLineProduct
    ? hamperMode
      ? isInCart(cartLineProduct, { hamperSelections })
      : isInCart(cartLineProduct)
    : false;
  const qtyInBag = cartLineProduct
    ? hamperMode
      ? cartQuantityForProduct(cartLineProduct, { hamperSelections })
      : cartQuantityForProduct(cartLineProduct)
    : 0;

  const handleAddToCart = useCallback((): boolean => {
    if (!cartLineProduct || outOfStock || product?.onlyInHamper) return false;
    const bundle = product?.hamperBundle;
    if (bundle?.slots?.length) {
      if (!hamperSelectionsComplete(bundle, hamperSelections)) {
        setHamperSheetOpen(true);
        return false;
      }
      const addOnTotal = bundle.slots.reduce((sum, slot) => {
        const sel = hamperSelections[slot.id];
        if (!sel?.productId) return sum;
        const picked = hamperProductMap.get(sel.productId);
        return sum + hamperSlotSelectionCharge(slot, sel, picked?.price);
      }, 0);
      const hamperLineProduct: Product = {
        ...cartLineProduct,
        price: cartLineProduct.price + addOnTotal,
      };
      addToCart(hamperLineProduct, quantity, {
        hamperSelections,
        giftMessage: bundle.allowGiftMessage ? giftMessage : undefined,
      });
      return true;
    }
    addToCart(cartLineProduct, quantity);
    return true;
  }, [
    cartLineProduct,
    outOfStock,
    quantity,
    addToCart,
    product?.hamperBundle,
    product?.onlyInHamper,
    hamperSelections,
    hamperProductMap,
    giftMessage,
  ]);

  const handleCheckoutNow = useCallback(() => {
    if (!handleAddToCart()) return;
    navigate('/checkout');
  }, [handleAddToCart, navigate]);

  const cc = displayCc ?? product?.currencyCode;
  const hamperPricing = useMemo(() => {
    const bundle = product?.hamperBundle;
    if (!bundle?.slots?.length) return null;
    const currency = cc;
    const selectedAddOnRows = bundle.slots
      .map((slot) => {
        const sel = hamperSelections[slot.id];
        if (!sel?.productId) return null;
        const picked = hamperProductMap.get(sel.productId);
        const selectionText =
          sel.productId === '__section__'
            ? 'Section only'
            : [sel.productName, sel.variantLabel].filter(Boolean).join(' · ');
        return {
          slotId: slot.id,
          label: slot.label,
          selectionText,
          amount: hamperSlotSelectionCharge(slot, sel, picked?.price),
          currency,
        };
      })
      .filter((x): x is { slotId: string; label: string; selectionText: string; amount: number; currency: string } => Boolean(x));
    const addOnTotal = selectedAddOnRows.reduce((sum, row) => sum + row.amount, 0);
    return {
      base: displayPrice,
      addOnTotal,
      grandValue: displayPrice + addOnTotal,
      rows: selectedAddOnRows,
      currency,
    };
  }, [product?.hamperBundle, hamperSelections, hamperProductMap, displayPrice, cc]);

  const hamperCardHint = useMemo(() => {
    const bundle = product?.hamperBundle;
    if (!bundle?.slots.length) return null;
    const configured = bundle.slots.filter((s) => hamperSelections[s.id]).length;
    const hasRequired = bundle.slots.some((s) => s.required && s.productIds.length > 0);
    const ready = hamperSelectionsComplete(bundle, hamperSelections);
    if (hasRequired && !ready) {
      return {
        body: 'Open the gift box to finish required sections.',
        button: 'Customize gift box' as const,
      };
    }
    if (configured > 0) {
      return {
        body: 'Selections saved — add to cart or keep editing in the gift box.',
        button: 'Edit gift box' as const,
      };
    }
    return {
      body: 'Hamper sections are optional — open the gift box to customize, or add the base piece only.',
      button: 'Customize gift box' as const,
    };
  }, [product?.hamperBundle, hamperSelections]);

  if (isLoading) {
    return (
      <Layout>
        <div className="pt-32 pb-24 container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-square rounded-lg bg-muted/40 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-muted/40 rounded animate-pulse w-3/4" />
              <div className="h-12 bg-muted/40 rounded animate-pulse w-1/2" />
              <div className="h-24 bg-muted/40 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="pt-32 pb-24 text-center">
          <h1 className="text-2xl font-display">Product not found</h1>
          <Link to="/shop" className="text-primary mt-4 inline-block">
            Return to Shop
          </Link>
        </div>
      </Layout>
    );
  }

  const inWishlist = isInWishlist(product.id);

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const onlyInHamper = Boolean(product.onlyInHamper);

  return (
    <Layout>
      <section className="pt-28 pb-24">
        <div className="container mx-auto px-6">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <Link
              to="/shop"
              className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Shop
            </Link>
          </motion.div>

          {onlyInHamper ? (
            <div className="mb-8 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
              <Gift className="inline w-4 h-4 text-primary mr-2 align-text-bottom" />
              This piece is not sold on its own — it&apos;s available only as part of a curated gift
              hamper. <Link to="/shop" className="text-primary underline-offset-4 hover:underline">Browse the shop</Link> for bundles.
            </div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border-gold-glow mb-4">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`${selectedImage}-${displayImages[selectedImage] ?? ''}`}
                    src={displayImages[selectedImage] ?? product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>

                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.isNew && (
                    <span className="bg-primary text-primary-foreground text-xs uppercase tracking-wider px-3 py-1 rounded">
                      New
                    </span>
                  )}
                  {displayOriginal != null && (
                    <span className="bg-accent text-accent-foreground text-xs uppercase tracking-wider px-3 py-1 rounded">
                      Sale
                    </span>
                  )}
                </div>
              </div>

              {displayImages.length > 1 && (
                <div className="flex gap-3 flex-wrap">
                  {displayImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded overflow-hidden border-2 transition-colors ${
                        selectedImage === index
                          ? 'border-primary'
                          : 'border-transparent hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">
                {product.tagline || product.collection || product.category}
              </p>
              <h1
                className={`text-3xl md:text-4xl lg:text-5xl font-display font-semibold ${
                  effectiveVariant?.title?.trim() ? 'mb-2' : 'mb-6'
                }`}
              >
                {product.name}
              </h1>
              {effectiveVariant?.title?.trim() ? (
                <p className="text-base text-muted-foreground mb-6">{effectiveVariant.title}</p>
              ) : null}

              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-2xl md:text-3xl font-semibold text-gold-gradient">
                    {formatPrice(displayPrice, cc)}
                  </span>
                  {displayOriginal != null && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(displayOriginal, cc)}
                    </span>
                  )}
                </div>
                {hamperPricing && hamperPricing.addOnTotal > 0 ? (
                  <div className="rounded-lg border border-border/40 bg-muted/15 px-3 py-2.5 space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Bundle with your selections
                    </p>
                    <p className="text-lg font-semibold text-gold-gradient tabular-nums">
                      {formatPrice(hamperPricing.grandValue, cc)}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Product {formatPrice(hamperPricing.base, cc)} + hamper add-ons{' '}
                      {formatPrice(hamperPricing.addOnTotal, cc)}
                    </p>
                  </div>
                ) : null}
              </div>

              <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
                {product.description}
              </p>

              {product.hamperBundle?.slots?.length ? (
                <div className="mb-8 rounded-lg border border-border/50 bg-muted/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 rounded-full border border-primary/35 bg-primary/10 p-2 shrink-0">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                        Gift hamper
                      </p>
                      <p className="text-sm text-foreground/90">
                        {hamperCardHint?.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {product.hamperBundle.slots.filter((s) => hamperSelections[s.id]).length} /{' '}
                        {product.hamperBundle.slots.length} sections configured
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="luxuryOutline"
                    className="shrink-0 w-full sm:w-auto"
                    onClick={() => setHamperSheetOpen(true)}
                  >
                    {hamperCardHint?.button ?? 'Customize gift box'}
                  </Button>
                </div>
              ) : null}

              {!product.hamperBundle?.slots?.length &&
              product.optionGroups &&
              product.optionGroups.length > 0 &&
              product.variants ? (
                <div className="mb-8 space-y-6">
                  {product.optionGroups.map((group) => (
                    <div key={group.id}>
                      <h3 className="text-sm uppercase tracking-wider font-semibold mb-3">
                        {group.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((val) => {
                          const selected = selectionByOptionId[group.id] === val.id;
                          return (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() => pickOptionValue(group.id, val.id)}
                              className={`px-4 py-2 text-sm rounded border transition-colors ${
                                selected
                                  ? 'border-primary bg-primary/10 text-foreground'
                                  : 'border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                              }`}
                            >
                              {val.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {attributeRows.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider font-semibold mb-4">
                    Attributes
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {attributeRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-col sm:flex-row sm:gap-2 border-b border-border/20 pb-3 sm:border-0 sm:pb-0"
                      >
                        <dt className="text-muted-foreground shrink-0 sm:min-w-[160px]">{row.label}</dt>
                        <dd className="text-foreground/90 font-medium">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {product.details && product.details.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider font-semibold mb-4">
                    Details
                  </h3>
                  <ul className="space-y-2">
                    {product.details.map((detail, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center border border-border/50 rounded">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-muted transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      disabled={quantity >= maxQty}
                      className="p-3 hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleAddToCart}
                    disabled={outOfStock || onlyInHamper}
                    className="flex-1 min-w-[200px]"
                  >
                    {onlyInHamper
                      ? 'Hamper add-on only'
                      : outOfStock
                        ? 'Out of stock'
                        : 'Add to cart'}
                  </Button>
                  <Button
                    variant="luxuryOutline"
                    size="xl"
                    onClick={handleCheckoutNow}
                    disabled={outOfStock || onlyInHamper}
                    className="min-w-[180px]"
                  >
                    Checkout now
                  </Button>

                  {inCartLine && !outOfStock ? (
                    <Button variant="luxuryOutline" size="xl" className="min-w-[160px]" asChild>
                      <Link to="/cart">View cart{qtyInBag > 0 ? ` (${qtyInBag})` : ''}</Link>
                    </Button>
                  ) : null}

                  <Button
                    variant={inWishlist ? 'luxury' : 'luxuryOutline'}
                    size="xl"
                    onClick={handleWishlistToggle}
                    className="px-5"
                  >
                    <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                  </Button>
                </div>
                {inCartLine && !outOfStock ? (
                  <p className="text-sm text-muted-foreground">
                    <Check className="inline w-4 h-4 text-primary mr-1.5 align-text-bottom" />
                    {qtyInBag} {qtyInBag === 1 ? 'item' : 'items'} in your bag — add more above or{' '}
                    <Link to="/cart" className="text-primary underline-offset-4 hover:underline">
                      open cart
                    </Link>
                    .
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                {trustRow.slice(0, 3).map((badge, i) => {
                  const Icon = badge.icon ? TRUST_ICONS[badge.icon] : TRUST_ICONS[DEFAULT_TRUST[i]?.icon ?? 'truck'];
                  return (
                    <div key={`${badge.label}-${i}`} className="p-4 glass-card rounded-lg">
                      <Icon className="w-5 h-5 mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">{badge.label}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {product.hamperBundle?.slots?.length ? (
            <Sheet open={hamperSheetOpen} onOpenChange={setHamperSheetOpen}>
              <SheetContent
                side="right"
                className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto border-l border-border/40"
              >
                <SheetHeader className="pr-10 text-left space-y-2">
                  <SheetTitle className="font-display text-xl">Build your gift box</SheetTitle>
                  <SheetDescription className="text-left text-balance">
                    Pick each section and gift note below. The summary shows product price plus your
                    hamper add-ons — same total as &ldquo;Bundle with your selections&rdquo; on the
                    page.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6 pb-10">
                  <HamperConfigurator
                    bundle={product.hamperBundle}
                    productById={hamperProductMap}
                    value={hamperSelections}
                    onChange={setHamperSelections}
                    giftMessage={giftMessage}
                    onGiftMessageChange={setGiftMessage}
                    embedded
                  />
                  {hamperPricing ? (
                    <div className="rounded-xl border border-border/50 bg-muted/10 p-4 md:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm uppercase tracking-wider font-semibold">
                          Hamper pricing details
                        </h3>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Live summary
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base hamper product</span>
                        <span className="tabular-nums font-medium">
                          {formatPrice(hamperPricing.base, hamperPricing.currency)}
                        </span>
                      </div>
                      {hamperPricing.rows.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
                          No hamper add-ons selected yet.
                        </div>
                      ) : null}
                      {hamperPricing.rows.map((row) => (
                        <div
                          key={row.slotId}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="text-muted-foreground">
                            <span className="block">{row.label}</span>
                            <span className="block text-[11px] text-foreground/85 mt-0.5">
                              Selected: {row.selectionText}
                            </span>
                          </span>
                          <span className="tabular-nums font-medium whitespace-nowrap">
                            + {formatPrice(row.amount, row.currency)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                        <span className="font-medium">Bundle value with your selections</span>
                        <span className="font-semibold text-gold-gradient tabular-nums text-base">
                          {formatPrice(hamperPricing.grandValue, hamperPricing.currency)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="hero"
                    className="w-full"
                    onClick={() => setHamperSheetOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          {suggestedProducts.length > 0 && (
            <div className="mt-24 pt-16 border-t border-border/20">
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-center mb-3">
                Curated for you
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-12 max-w-lg mx-auto">
                Complementary pieces from our collections — hand-picked to pair with what you love.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {suggestedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
