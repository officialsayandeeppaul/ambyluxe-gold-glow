import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { HttpTypes } from '@medusajs/types';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { medusa, isMedusaConfigured } from '@/integrations/medusa/client';
import { useAuth } from '@/hooks/useAuth';
import { useStore, cartItemLineKey } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { cn } from '@/lib/utils';
import { medusaMinorToMajor } from '@/lib/medusa/currency';
import {
  refreshCartPricesFromMedusa,
  resetMedusaCartLinesFromLocalCart,
  getMedusaCartId,
  clearMedusaCartIdStorage,
  clearMedusaCartShippingMethods,
  reapplyManualPromotionsToCart,
} from '@/lib/medusa/cartSync';
import {
  loadRazorpayCheckoutScript,
  PAYMENT_COLLECTION_QUERY_FIELDS,
  parseRazorpayOrderFromSessionData,
  pickRazorpayPaymentSession,
  RAZORPAY_PAYMENT_PROVIDER_ID,
} from '@/lib/medusa/razorpayCheckout';
import {
  StateSearchCombobox,
  CitySearchCombobox,
} from '@/components/checkout/AddressPickers';
import { DistrictSearchCombobox } from '@/components/checkout/DistrictSearchCombobox';
import {
  GooglePlacesAddressField,
  type ResolvedIndianAddress,
} from '@/components/checkout/GooglePlacesAddressField';
import type { InDistrictSuggestion, InLocationSuggestion } from '@/lib/medusa/storeSuggest';
import { fetchIndiaPinVerify } from '@/lib/medusa/pinVerify';
import type { IndiaPinVerifyResponse } from '@/lib/medusa/pinVerify';
import {
  districtFuzzyMatch,
  statesAlignForPin,
  validateAddress2Landmark,
  validateStreetLine1,
} from '@/lib/indiaAddressValidation';
import { matchIndiaStateLabel } from '@/data/indiaStatesAndUts';
import { ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { CheckoutCouponSection } from '@/components/checkout/CheckoutCouponSection';
import {
  buildAppliedCouponDisplays,
  buildScrollableManualOffers,
  fetchStoreCheckoutPromotions,
  manualPromoCodesExcept,
  manualPromoCodesOnCart,
  type CheckoutPromotionCatalogItem,
} from '@/lib/medusa/checkoutPromotions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type CheckoutShipOption = {
  id: string;
  name: string;
  amountMinor: number;
};

/** Coerce Medusa cart money fields for comparisons (minor units). */
function cartMinor(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if ('numeric' in o) {
      const n = Number(o.numeric);
      if (Number.isFinite(n)) return n;
    }
    if ('numeric_' in o) {
      const n = Number(o.numeric_);
      if (Number.isFinite(n)) return n;
    }
    if ('value' in o) {
      const n = Number(o.value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function shippingOptionAmountMinor(o: {
  calculated_price?: { calculated_amount?: number | null } | null;
  amount?: number;
}): number {
  const c = o.calculated_price?.calculated_amount;
  if (typeof c === 'number' && Number.isFinite(c)) return c;
  return typeof o.amount === 'number' ? o.amount : 0;
}

const CART_FIELDS =
  '+id,+email,+total,*region,*items,*items.variant,*customer,*payment_collection,*payment_collection.payment_sessions,*shipping_methods,+billing_address,+shipping_address';

/** Cart fields for checkout sidebar: totals, discounts, applied promotions */
const CHECKOUT_SUMMARY_CART_FIELDS =
  '+item_subtotal,+shipping_subtotal,+shipping_total,+subtotal,+tax_total,+total,+discount_total,+discount_subtotal,+currency_code,*items,*items.product,*items.variant,*shipping_methods,*promotions';

/** Medusa `client.fetch` may return a parsed body or a `Response` depending on SDK version. */
async function cartFromStorePromotionsPayload(resultUnknown: unknown): Promise<HttpTypes.StoreCart | null> {
  if (!resultUnknown || typeof resultUnknown !== 'object') return null;
  if ('cart' in resultUnknown) {
    const c = (resultUnknown as { cart: HttpTypes.StoreCart | null | undefined }).cart;
    return c ?? null;
  }
  if (
    'json' in resultUnknown &&
    typeof (resultUnknown as Response).json === 'function'
  ) {
    try {
      const j = await (resultUnknown as Response).json();
      if (j && typeof j === 'object' && 'cart' in j) {
        return (j as { cart: HttpTypes.StoreCart }).cart ?? null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Lifted fields — soft “onyx” wells, generous radius */
const CInput =
  'mt-1.5 h-11 rounded-sm border border-border/50 bg-background-elevated/50 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground/65 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0 focus-visible:border-primary/30';
const CInputRo =
  'mt-1.5 h-11 rounded-sm border border-border/40 bg-muted/20 text-foreground shadow-sm cursor-default';
const CGInput =
  'h-11 rounded-sm border border-border/50 bg-background-elevated/50 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground/65 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0 focus-visible:border-primary/30';

async function completeCartWithRetry(
  cartId: string,
): Promise<HttpTypes.StoreCompleteCartResponse> {
  let last: HttpTypes.StoreCompleteCartResponse | undefined;
  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    last = await medusa.store.cart.complete(cartId, {
      fields: 'id,*items,+display_id,+currency_code',
    });
    if (last.type === 'order' && last.order) return last;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 600 + i * 350));
    }
  }
  return last!;
}

const Checkout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customer, isLoading: authLoading } = useAuth();
  const localCart = useStore((s) => s.cart);

  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressVerifiedByGoogle, setAddressVerifiedByGoogle] = useState(false);
  const [pinLookup, setPinLookup] = useState<IndiaPinVerifyResponse | null | 'loading'>(
    null,
  );

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim() ?? '';
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  const allLinesMedusa = useMemo(
    () => localCart.every((i) => i.product.variantId?.startsWith('variant_')),
    [localCart],
  );

  const cartFingerprint = useMemo(
    () => localCart.map((i) => `${cartItemLineKey(i)}:${i.quantity}`).join('|'),
    [localCart],
  );

  const [serverCart, setServerCart] = useState<HttpTypes.StoreCart | null>(null);

  const [shippingOptions, setShippingOptions] = useState<CheckoutShipOption[]>([]);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string | null>(null);
  const selectedShippingOptionIdRef = useRef<string | null>(null);
  selectedShippingOptionIdRef.current = selectedShippingOptionId;
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  /** Which known coupon is currently posting (for per-card spinners); null = manual entry or idle. */
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    if (name) {
      const parts = name.split(/\s+/);
      if (!firstName && parts[0]) setFirstName(parts[0]);
      if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(' '));
    }
    if (customer.phone && !phone) setPhone(customer.phone);
  }, [customer, firstName, lastName, phone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isMedusaConfigured() || localCart.length === 0) {
        setBooting(false);
        return;
      }
      try {
        await refreshCartPricesFromMedusa();
        /** Full reset so Medusa lines match local cart only (incremental sync leaves duplicate lines). */
        await resetMedusaCartLinesFromLocalCart();
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error('Could not sync cart with the server.');
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cartFingerprint]);

  useEffect(() => {
    if (!isMedusaConfigured() || booting || localCart.length === 0) {
      setServerCart(null);
      return;
    }
    const cartId = getMedusaCartId();
    if (!cartId) {
      setServerCart(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { cart } = await medusa.store.cart.retrieve(cartId, {
          fields: CHECKOUT_SUMMARY_CART_FIELDS,
        });
        if (!cancelled) setServerCart(cart ?? null);
      } catch {
        if (!cancelled) setServerCart(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booting, cartFingerprint]);

  const addressComplete = useMemo(() => {
    const phoneDigits = phone.replace(/\D/g, '');
    const line1Ok = validateStreetLine1(address1).ok;
    const line2Ok = validateAddress2Landmark(address2).ok;
    const pinFmt = /^\d{6}$/.test(postalCode.trim());

    let pinAndRegionOk = false;
    if (googleMapsKey) {
      pinAndRegionOk = addressVerifiedByGoogle && pinFmt;
    } else {
      pinAndRegionOk =
        pinFmt &&
        pinLookup !== 'loading' &&
        pinLookup !== null &&
        pinLookup.ok === true &&
        statesAlignForPin(province, pinLookup.state);
    }

    const manualOrPreGoogle = !googleMapsKey || !addressVerifiedByGoogle;
    const districtOk = manualOrPreGoogle ? Boolean(district.trim()) : true;

    return (
      Boolean(firstName.trim()) &&
      Boolean(lastName.trim()) &&
      phoneDigits.length >= 10 &&
      line1Ok &&
      line2Ok &&
      districtOk &&
      Boolean(city.trim()) &&
      Boolean(province.trim()) &&
      pinAndRegionOk
    );
  }, [
    firstName,
    lastName,
    phone,
    address1,
    address2,
    district,
    city,
    province,
    postalCode,
    googleMapsKey,
    addressVerifiedByGoogle,
    pinLookup,
  ]);

  /** Why “Delivery speed” is not available yet — shown in checkout so shoppers aren’t stuck. */
  const addressDeliveryBlockers = useMemo((): string[] => {
    if (addressComplete) return [];
    const items: string[] = [];
    const phoneDigits = phone.replace(/\D/g, '');
    if (!firstName.trim()) items.push('First name');
    if (!lastName.trim()) items.push('Last name');
    if (phoneDigits.length < 10) items.push('Phone (at least 10 digits)');
    if (!province.trim()) items.push('State / UT');
    const manualOrPreGoogle = !googleMapsKey || !addressVerifiedByGoogle;
    if (manualOrPreGoogle && !district.trim()) items.push('District');
    if (!city.trim()) items.push('City or town');
    const pinOk = /^\d{6}$/.test(postalCode.trim());
    if (!pinOk) items.push('PIN (6 digits)');
    if (googleMapsKey) {
      if (
        pinOk &&
        province.trim() &&
        district.trim() &&
        city.trim() &&
        !addressVerifiedByGoogle
      ) {
        items.push('Pick a verified suggestion for street / building in step 5');
      }
    } else {
      if (pinOk && province.trim()) {
        if (pinLookup === 'loading') items.push('Wait for PIN verification to finish');
        else if (pinLookup == null || !pinLookup.ok) items.push('PIN must be valid for the state you selected');
        else if (!statesAlignForPin(province, pinLookup.state))
          items.push('PIN does not match the selected state');
      }
    }
    const l1 = validateStreetLine1(address1);
    if (!l1.ok) items.push(l1.message ?? 'Street address');
    const l2 = validateAddress2Landmark(address2);
    if (!l2.ok) items.push(l2.message ?? 'Flat, floor, or landmark');
    const seen = new Set<string>();
    return items.filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }, [
    addressComplete,
    firstName,
    lastName,
    phone,
    province,
    district,
    city,
    postalCode,
    googleMapsKey,
    addressVerifiedByGoogle,
    pinLookup,
    address1,
    address2,
  ]);

  const streetLineValidation = useMemo(() => validateStreetLine1(address1), [address1]);
  const landmarkValidation = useMemo(() => validateAddress2Landmark(address2), [address2]);

  const addressFingerprint = useMemo(
    () =>
      [
        firstName.trim(),
        lastName.trim(),
        phone.replace(/\D/g, ''),
        address1.trim(),
        address2.trim(),
        district.trim(),
        city.trim(),
        province.trim(),
        postalCode.trim(),
        googleMapsKey ? (addressVerifiedByGoogle ? 'g:1' : 'g:0') : 'm',
      ].join('|'),
    [
      firstName,
      lastName,
      phone,
      address1,
      address2,
      district,
      city,
      province,
      postalCode,
      googleMapsKey,
      addressVerifiedByGoogle,
    ],
  );

  const refreshSummaryCart = useCallback(async () => {
    if (!isMedusaConfigured()) return;
    const cartId = getMedusaCartId();
    if (!cartId) return;
    try {
      const { cart } = await medusa.store.cart.retrieve(cartId, {
        fields: CHECKOUT_SUMMARY_CART_FIELDS,
      });
      setServerCart(cart ?? null);
    } catch {
      /* leave existing summary */
    }
  }, []);

  const applyPromotionByCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || !isMedusaConfigured()) return;
      const cartId = getMedusaCartId();
      if (!cartId) {
        toast.error('Your bag could not be loaded. Add items from the shop, then open checkout again.');
        return;
      }
      setPromoBusy(true);
      setApplyingCode(code.toUpperCase());
      try {
        const { cart: cartForPromos } = await medusa.store.cart.retrieve(cartId, {
          fields: CHECKOUT_SUMMARY_CART_FIELDS,
        });
        const otherManual = manualPromoCodesExcept(cartForPromos?.promotions, code.toUpperCase());
        for (const old of otherManual) {
          await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
            method: 'DELETE',
            body: { promo_codes: [old] },
          });
        }

        const fetchResult = await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
          method: 'POST',
          body: { promo_codes: [code] },
        });
        await cartFromStorePromotionsPayload(fetchResult);

        const prevDiscount = cartMinor(cartForPromos?.discount_total);
        const prevShipping = cartMinor(cartForPromos?.shipping_total);
        const prevTotal = cartMinor(cartForPromos?.total);

        const { cart: fresh } = await medusa.store.cart.retrieve(cartId, {
          fields: CHECKOUT_SUMMARY_CART_FIELDS,
        });
        setServerCart(fresh ?? null);

        const codeUpper = code.trim().toUpperCase();
        const stillHasCode =
          Array.isArray(fresh?.promotions) &&
          fresh.promotions.some(
            (p) =>
              p &&
              typeof p === 'object' &&
              String((p as { code?: string }).code ?? '')
                .trim()
                .toUpperCase() === codeUpper,
          );

        if (!stillHasCode) {
          toast.error('This offer code is not valid for your bag right now.');
          return;
        }

        const d = cartMinor(fresh?.discount_total);
        const s = cartMinor(fresh?.shipping_total);
        const t = cartMinor(fresh?.total);
        const savedMoney = d > prevDiscount || s < prevShipping || t < prevTotal;

        if (!savedMoney) {
          await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
            method: 'DELETE',
            body: { promo_codes: [code] },
          });
          const { cart: afterRemove } = await medusa.store.cart.retrieve(cartId, {
            fields: CHECKOUT_SUMMARY_CART_FIELDS,
          });
          setServerCart(afterRemove ?? null);
          toast.error(
            'That offer does not apply to this bag (wrong items, quantity, or rules).',
          );
          return;
        }

        setPromoInput('');
        void queryClient.invalidateQueries({ queryKey: ['store-checkout-promotions'] });
        toast.success('Offer applied.');
      } catch (e: unknown) {
        let msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: string }).message)
            : 'Could not apply that code.';
        const lower = msg.toLowerCase();
        if (lower.includes('invalid') && (lower.includes('promo') || lower.includes('promotion'))) {
          if (import.meta.env.DEV) {
            console.warn(
              '[Checkout] Promotion not accepted by server. If you rely on bundled sample offers, seed them from the backend: npm run seed:promotions',
            );
          }
          toast.error(
            'This offer code is not valid right now. Check spelling, or pick another offer from the list above.',
          );
        } else {
          toast.error(msg);
        }
      } finally {
        setApplyingCode(null);
        setPromoBusy(false);
      }
    },
    [queryClient, refreshSummaryCart],
  );

  const applyPromotionCode = useCallback(() => {
    void applyPromotionByCode(promoInput);
  }, [applyPromotionByCode, promoInput]);

  const removePromotionCode = useCallback(
    async (code: string) => {
      if (!isMedusaConfigured() || !code) return;
      const cartId = getMedusaCartId();
      if (!cartId) return;
      setPromoBusy(true);
      try {
        await medusa.client.fetch(`/store/carts/${cartId}/promotions`, {
          method: 'DELETE',
          body: { promo_codes: [code] },
        });
        await refreshSummaryCart();
        void queryClient.invalidateQueries({ queryKey: ['store-checkout-promotions'] });
        toast.success('Promotion removed.');
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: string }).message)
            : 'Could not remove that promotion.';
        toast.error(msg);
      } finally {
        setPromoBusy(false);
      }
    },
    [queryClient, refreshSummaryCart],
  );

  const localSubtotal = useMemo(
    () => localCart.reduce((s, i) => s + i.product.price * i.quantity, 0),
    [localCart],
  );

  const promotionCatalogCartId = serverCart?.id ?? '';

  const { data: promotionCatalog = [], isLoading: promotionCatalogLoading } = useQuery({
    queryKey: ['store-checkout-promotions', promotionCatalogCartId, cartFingerprint],
    queryFn: () =>
      fetchStoreCheckoutPromotions(
        promotionCatalogCartId ? promotionCatalogCartId : undefined,
      ),
    enabled:
      isMedusaConfigured() &&
      Boolean(customer) &&
      localCart.length > 0 &&
      Boolean(promotionCatalogCartId),
    staleTime: 60_000,
  });

  const appliedCouponDisplays = useMemo(() => {
    if (!isMedusaConfigured()) return [];
    const raw = serverCart?.promotions;
    if (!Array.isArray(raw)) return [];
    return buildAppliedCouponDisplays(raw, promotionCatalog);
  }, [serverCart?.promotions, promotionCatalog]);

  const appliedPromotionCodeUpperSet = useMemo(() => {
    const raw = serverCart?.promotions;
    if (!Array.isArray(raw)) return new Set<string>();
    const s = new Set<string>();
    for (const p of raw) {
      if (p && typeof p === 'object' && 'code' in p) {
        const c = String((p as { code?: string }).code ?? '')
          .trim()
          .toUpperCase();
        if (c) s.add(c);
      }
    }
    return s;
  }, [serverCart?.promotions]);

  const scrollableManualOffers = useMemo((): CheckoutPromotionCatalogItem[] => {
    if (!isMedusaConfigured()) return [];
    return buildScrollableManualOffers(promotionCatalog, appliedPromotionCodeUpperSet);
  }, [promotionCatalog, appliedPromotionCodeUpperSet]);

  const currency =
    serverCart?.currency_code?.toUpperCase() ?? localCart[0]?.product.currencyCode ?? 'INR';

  /** Lines + subtotal always match the shopper’s in-memory bag (same as cart page). Medusa supplies tax/discount/shipping/pay total. */
  const itemSubtotalMajor = localSubtotal;
  const shippingMajor = serverCart
    ? medusaMinorToMajor(serverCart.shipping_total ?? 0, serverCart.currency_code)
    : null;
  const taxMajor = serverCart
    ? medusaMinorToMajor(serverCart.tax_total ?? 0, serverCart.currency_code)
    : null;
  const discountMajor = serverCart
    ? medusaMinorToMajor(serverCart.discount_total ?? 0, serverCart.currency_code)
    : 0;

  /** Only show a shipping £/₹ amount after address is complete and a delivery option is selected (avoids stale cart shipping). */
  const showCommittedShippingLine = useMemo(() => {
    if (!addressComplete) return false;
    if (shippingLoading) return false;
    if (shippingOptions.length === 0) return false;
    return Boolean(selectedShippingOptionId);
  }, [
    addressComplete,
    shippingLoading,
    shippingOptions.length,
    selectedShippingOptionId,
  ]);

  const shippingMajorForSummary =
    showCommittedShippingLine && serverCart ? shippingMajor : null;

  /** Pay only after a real delivery choice (options loaded + one selected). */
  const checkoutPayReady = useMemo(() => {
    if (!addressComplete) return false;
    if (shippingLoading) return false;
    if (shippingOptions.length === 0) return false;
    return Boolean(selectedShippingOptionId);
  }, [addressComplete, shippingLoading, shippingOptions.length, selectedShippingOptionId]);

  /** Shipping-target promos only: show ₹ discount in the grid after a delivery method is chosen. */
  const shippingOnlyDiscountPending = useMemo(() => {
    if (showCommittedShippingLine) return false;
    if (!appliedCouponDisplays.length) return false;
    const targets = appliedCouponDisplays.map((c) => c.applicationTarget);
    if (targets.some((t) => t === 'unknown')) return false;
    return targets.every((t) => t === 'shipping_methods');
  }, [appliedCouponDisplays, showCommittedShippingLine]);

  /**
   * Before a delivery method is chosen: estimate from the bag + Medusa discount/tax (no shipping).
   * When pay-ready: use Medusa `cart.total` — same basis as the payment collection / Razorpay (avoids e.g. UI ₹599 vs modal ₹500).
   */
  const estimatedPayTotalMajor = useMemo(() => {
    if (!serverCart) return localSubtotal;
    if (checkoutPayReady) {
      return medusaMinorToMajor(cartMinor(serverCart.total), serverCart.currency_code);
    }
    let major = itemSubtotalMajor;
    if (discountMajor > 0 && !shippingOnlyDiscountPending) {
      major = Math.max(0, major - discountMajor);
    }
    if (taxMajor != null && taxMajor > 0) {
      major += taxMajor;
    }
    return major;
  }, [
    serverCart,
    checkoutPayReady,
    localSubtotal,
    itemSubtotalMajor,
    discountMajor,
    shippingOnlyDiscountPending,
    taxMajor,
  ]);

  useEffect(() => {
    if (!isMedusaConfigured() || booting || !customer?.email || localCart.length === 0) return;
    if (addressComplete) return;
    let cancelled = false;
    void (async () => {
      await clearMedusaCartShippingMethods();
      if (cancelled) return;
      const cartId = getMedusaCartId();
      if (!cartId) return;
      try {
        const { cart } = await medusa.store.cart.retrieve(cartId, {
          fields: CHECKOUT_SUMMARY_CART_FIELDS,
        });
        if (!cancelled) setServerCart(cart ?? null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addressComplete, addressFingerprint, booting, cartFingerprint, customer?.email, localCart.length]);

  useEffect(() => {
    if (!isMedusaConfigured() || booting || !customer?.email || localCart.length === 0) {
      setShippingOptions([]);
      setSelectedShippingOptionId(null);
      setShippingError(null);
      return;
    }
    if (!addressComplete) {
      setShippingOptions([]);
      setSelectedShippingOptionId(null);
      setShippingError(null);
      return;
    }

    const cartId = getMedusaCartId();
    if (!cartId) {
      setShippingOptions([]);
      setSelectedShippingOptionId(null);
      return;
    }

    let cancelled = false;
    const phoneDigits = phone.replace(/\D/g, '');
    const t = window.setTimeout(() => {
      void (async () => {
        const distMeta =
          district.trim().length > 0 ? { metadata: { district: district.trim() } } : {};
        try {
          setShippingLoading(true);
          setShippingError(null);
          await refreshCartPricesFromMedusa();
          await resetMedusaCartLinesFromLocalCart();
          await medusa.store.cart.transferCart(cartId, { fields: CART_FIELDS });
          await medusa.store.cart.update(
            cartId,
            {
              email: customer.email,
              shipping_address: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phoneDigits,
                address_1: address1.trim(),
                address_2: address2.trim() || undefined,
                city: city.trim(),
                province: province.trim(),
                postal_code: postalCode.trim(),
                country_code: 'in',
                ...distMeta,
              },
              billing_address: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phoneDigits,
                address_1: address1.trim(),
                address_2: address2.trim() || undefined,
                city: city.trim(),
                province: province.trim(),
                postal_code: postalCode.trim(),
                country_code: 'in',
                ...distMeta,
              },
            },
            { fields: CART_FIELDS },
          );
          await medusa.store.customer.update({
            phone: phoneDigits,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          });

          const { shipping_options } = await medusa.store.fulfillment.listCartOptions({
            cart_id: cartId,
          });
          if (cancelled) return;

          const raw = shipping_options ?? [];
          const eligible = raw.filter((o) => !o.insufficient_inventory);
          const opts: CheckoutShipOption[] = eligible.map((o) => ({
            id: o.id,
            name: o.name?.trim() || 'Shipping',
            amountMinor: shippingOptionAmountMinor(o),
          }));

          setShippingOptions(opts);
          const firstId = opts[0]?.id ?? null;
          const preferred = selectedShippingOptionIdRef.current;
          const applyId =
            preferred && opts.some((o) => o.id === preferred) ? preferred : firstId;
          setSelectedShippingOptionId(applyId);
          if (applyId) {
            await medusa.store.cart.addShippingMethod(
              cartId,
              { option_id: applyId },
              { fields: CART_FIELDS },
            );
          }
          const { cart } = await medusa.store.cart.retrieve(cartId, {
            fields: CHECKOUT_SUMMARY_CART_FIELDS,
          });
          if (!cancelled && cart) setServerCart(cart);
        } catch (e) {
          if (!cancelled) {
            setShippingError(e instanceof Error ? e.message : 'Could not load shipping options.');
            setShippingOptions([]);
            setSelectedShippingOptionId(null);
          }
        } finally {
          if (!cancelled) setShippingLoading(false);
        }
      })();
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedShippingOptionId handled via change handler; avoid reload loop
  }, [addressFingerprint, customer?.email, customer?.id, booting, cartFingerprint, localCart.length]);

  const handleShippingOptionChange = useCallback(
    async (optionId: string) => {
      const cartId = getMedusaCartId();
      if (!cartId || !customer) return;
      setSelectedShippingOptionId(optionId);
      try {
        setShippingLoading(true);
        await medusa.store.cart.addShippingMethod(
          cartId,
          { option_id: optionId },
          { fields: CART_FIELDS },
        );
        const { cart } = await medusa.store.cart.retrieve(cartId, {
          fields: CHECKOUT_SUMMARY_CART_FIELDS,
        });
        if (cart) setServerCart(cart);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update shipping method.');
      } finally {
        setShippingLoading(false);
      }
    },
    [customer],
  );

  const bumpGoogleVerification = useCallback(() => {
    if (googleMapsKey) setAddressVerifiedByGoogle(false);
  }, [googleMapsKey]);

  const handleLocationPick = useCallback(
    (s: InLocationSuggestion) => {
      bumpGoogleVerification();
      const c =
        s.city?.trim() ||
        s.label
          .split(',')
          .map((x) => x.trim())
          .find(Boolean) ||
        '';
      setCity(c);
      const st = matchIndiaStateLabel(s.state);
      if (st) setProvince(st);
      if (s.district?.trim()) setDistrict((d) => d || s.district!.trim());
      const digits = s.postcode?.replace(/\D/g, '') ?? '';
      if (digits.length >= 6) setPostalCode(digits.slice(0, 6));
    },
    [bumpGoogleVerification],
  );

  const handleGoogleAddressResolved = useCallback((r: ResolvedIndianAddress) => {
    setAddress1(r.address1);
    setAddress2(r.address2);
    setCity(r.city);
    setProvince(r.province);
    setPostalCode(r.postalCode);
  }, []);

  const onProvincePick = useCallback(
    (v: string) => {
      bumpGoogleVerification();
      setProvince(v);
      setDistrict('');
      setCity('');
      setPostalCode('');
    },
    [bumpGoogleVerification],
  );

  const handleDistrictPick = useCallback(
    (s: InDistrictSuggestion) => {
      bumpGoogleVerification();
      setDistrict(s.district);
      setCity('');
      setPostalCode('');
    },
    [bumpGoogleVerification],
  );

  const onCityTyped = useCallback(
    (v: string) => {
      bumpGoogleVerification();
      setCity(v);
    },
    [bumpGoogleVerification],
  );

  const onPostalInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      bumpGoogleVerification();
      setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6));
    },
    [bumpGoogleVerification],
  );

  useEffect(() => {
    if (googleMapsKey) {
      setPinLookup(null);
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setPinLookup(null);
      return;
    }
    if (!province.trim()) {
      setPinLookup(null);
      return;
    }
    setPinLookup('loading');
    const t = window.setTimeout(() => {
      void fetchIndiaPinVerify(postalCode.trim()).then((r) => setPinLookup(r));
    }, 450);
    return () => window.clearTimeout(t);
  }, [postalCode, province, googleMapsKey]);

  const runCheckout = useCallback(async () => {
    if (!isMedusaConfigured()) {
      toast.error('Medusa is not configured.');
      return;
    }
    if (!razorpayKey) {
      toast.error('Set VITE_RAZORPAY_KEY_ID in .env (same as Razorpay Key ID).');
      return;
    }
    if (!customer) {
      toast.error('Sign in to complete your purchase.');
      return;
    }
    if (!customer.email) {
      toast.error('Your account must have an email on file.');
      return;
    }
    if (!allLinesMedusa) {
      toast.error('Checkout requires catalogue items from the live store (Medusa variants).');
      return;
    }
    if (localCart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    const cartId = getMedusaCartId();
    if (!cartId) {
      toast.error('No server cart — add items again.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Please enter your full name and phone.');
      return;
    }

    const streetCheck = validateStreetLine1(address1);
    if (!streetCheck.ok) {
      toast.error(streetCheck.message ?? 'Enter a complete street address.');
      return;
    }
    const landmarkCheck = validateAddress2Landmark(address2);
    if (!landmarkCheck.ok) {
      toast.error(
        landmarkCheck.message ?? 'Add flat, floor, or landmark for delivery.',
      );
      return;
    }
    if (!province.trim()) {
      toast.error('Select your state.');
      return;
    }
    const needLocalHierarchy = !googleMapsKey || !addressVerifiedByGoogle;
    if (needLocalHierarchy && !district.trim()) {
      toast.error('Select your district after the state.');
      return;
    }
    if (!city.trim()) {
      toast.error('Select your city or town from the list.');
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      toast.error('PIN code must be 6 digits.');
      return;
    }
    if (googleMapsKey) {
      if (!addressVerifiedByGoogle) {
        toast.error(
          'Choose your address from the Google suggestions list so we can validate it for delivery.',
        );
        return;
      }
    } else {
      if (pinLookup === 'loading' || pinLookup === null) {
        toast.error('Wait for PIN code verification, or check your PIN and state.');
        return;
      }
      if (!pinLookup.ok) {
        toast.error(
          'This PIN could not be verified. Check all 6 digits, your state, and try again (we query India Post and a backup directory).',
        );
        return;
      }
      if (!statesAlignForPin(province, pinLookup.state)) {
        toast.error(
          `PIN belongs to ${pinLookup.state ?? 'another state'}, but you selected ${province}. Align state and PIN.`,
        );
        return;
      }
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Enter a valid phone number (used for Razorpay).');
      return;
    }

    setBusy(true);
    let modalOpened = false;
    try {
      const distMetaPay =
        district.trim().length > 0 ? { metadata: { district: district.trim() } } : {};

      const { cart: cartBeforeLineReset } = await medusa.store.cart.retrieve(cartId, {
        fields: 'id,*promotions',
      });
      const manualPromoSnapshot = manualPromoCodesOnCart(cartBeforeLineReset?.promotions);

      await refreshCartPricesFromMedusa();
      await resetMedusaCartLinesFromLocalCart();
      await medusa.store.cart.transferCart(cartId, { fields: CART_FIELDS });

      await medusa.store.cart.update(
        cartId,
        {
          email: customer.email,
          shipping_address: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phoneDigits,
            address_1: address1.trim(),
            address_2: address2.trim() || undefined,
            city: city.trim(),
            province: province.trim(),
            postal_code: postalCode.trim(),
            country_code: 'in',
            ...distMetaPay,
          },
          billing_address: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phoneDigits,
            address_1: address1.trim(),
            address_2: address2.trim() || undefined,
            city: city.trim(),
            province: province.trim(),
            postal_code: postalCode.trim(),
            country_code: 'in',
            ...distMetaPay,
          },
        },
        { fields: CART_FIELDS },
      );

      await medusa.store.customer.update({
        phone: phoneDigits,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      const { shipping_options } = await medusa.store.fulfillment.listCartOptions({
        cart_id: cartId,
      });
      const eligible = (shipping_options ?? []).filter((o) => !o.insufficient_inventory);
      const chosen =
        selectedShippingOptionId && eligible.some((o) => o.id === selectedShippingOptionId)
          ? selectedShippingOptionId
          : eligible[0]?.id;
      if (!chosen) {
        throw new Error(
          'No delivery option for this address. Confirm fulfillment / stock location in Medusa Admin.',
        );
      }
      await medusa.store.cart.addShippingMethod(
        cartId,
        { option_id: chosen },
        { fields: CART_FIELDS },
      );

      await reapplyManualPromotionsToCart(cartId, manualPromoSnapshot);

      let { cart } = await medusa.store.cart.retrieve(cartId, { fields: CART_FIELDS });
      if (!cart) throw new Error('Cart not found');

      const initResult = (await medusa.store.payment.initiatePaymentSession(
        cart,
        { provider_id: RAZORPAY_PAYMENT_PROVIDER_ID },
        { fields: PAYMENT_COLLECTION_QUERY_FIELDS },
      )) as { payment_collection?: HttpTypes.StorePaymentCollection | null };

      let session = pickRazorpayPaymentSession(initResult.payment_collection);
      let razorpay = parseRazorpayOrderFromSessionData(session?.data);

      if (razorpay.providerError) {
        throw new Error(razorpay.providerError);
      }

      if (!razorpay.orderId) {
        const refreshed = await medusa.store.cart.retrieve(cartId, { fields: CART_FIELDS });
        cart = refreshed.cart;
        if (!cart) throw new Error('Cart not found after payment session');
        session = pickRazorpayPaymentSession(cart.payment_collection);
        razorpay = parseRazorpayOrderFromSessionData(session?.data);
      }

      if (razorpay.providerError) {
        throw new Error(razorpay.providerError);
      }

      if (!razorpay.orderId) {
        throw new Error(
          'Razorpay did not return an order id (payment session data is empty). In test mode, Razorpay usually caps orders at about ₹50,000 per transaction — your cart may exceed that. ' +
            'Try a smaller cart or reduce test prices. Also confirm RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env match your dashboard (test keys), restart Medusa, and check the Medusa terminal for "[Razorpay] orders.create failed".',
        );
      }

      const afterSession = await medusa.store.cart.retrieve(cartId, { fields: CART_FIELDS });
      const pc = afterSession.cart?.payment_collection;
      const pcRaw = (pc as { raw_amount?: number | string } | undefined)?.raw_amount;
      const pcNum =
        pcRaw == null
          ? NaN
          : typeof pcRaw === 'number'
            ? pcRaw
            : typeof pcRaw === 'string'
              ? parseInt(pcRaw, 10)
              : Number(pcRaw);
      if (
        typeof razorpay.amount === 'number' &&
        Number.isFinite(pcNum) &&
        pcNum !== razorpay.amount
      ) {
        throw new Error(
          `Cart total (${pcNum} smallest units) does not match the Razorpay order (${razorpay.amount}). Go back to the cart, wait a moment, and try checkout again so the payment session is recreated.`,
        );
      }

      await loadRazorpayCheckoutScript();
      const Rp = window.Razorpay;
      if (!Rp) throw new Error('Razorpay failed to load');

      const rzp = new Rp({
        key: razorpayKey,
        ...(typeof razorpay.amount === 'number' ? { amount: razorpay.amount } : {}),
        currency: (razorpay.currency ?? 'INR').toUpperCase(),
        order_id: razorpay.orderId,
        name: 'Amby Luxe Jewels',
        description: 'Jewellery purchase',
        prefill: {
          email: customer.email,
          contact: phoneDigits,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
        handler: async () => {
          try {
            const result = await completeCartWithRetry(cartId);
            if (result.type === 'order' && result.order) {
              useStore.setState({ cart: [] });
              clearMedusaCartIdStorage();
              toast.success('Order placed successfully.');
              navigate('/order/confirmation', { state: { order: result.order } });
            } else {
              const err =
                result.type === 'cart' ? (result as { error?: { message?: string } }).error : undefined;
              toast.error(err?.message ?? 'Payment could not be confirmed. Try again.');
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Order failed.');
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          },
        },
      });
      rzp.on('payment.failed', (response: unknown) => {
        console.error(response);
        toast.error('Payment failed. Try another method or card.');
        setBusy(false);
      });
      rzp.open();
      modalOpened = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed.';
      toast.error(msg);
    } finally {
      if (!modalOpened) setBusy(false);
    }
  }, [
    customer,
    localCart.length,
    allLinesMedusa,
    firstName,
    lastName,
    phone,
    address1,
    address2,
    district,
    city,
    province,
    postalCode,
    googleMapsKey,
    addressVerifiedByGoogle,
    pinLookup,
    navigate,
    razorpayKey,
    selectedShippingOptionId,
  ]);

  if (!isMedusaConfigured()) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">
            Connect the Medusa backend and publishable key to enable checkout.
          </p>
          <Link to="/cart">
            <Button variant="luxuryOutline">Back to cart</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  if (localCart.length === 0) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">Your cart is empty.</p>
          <Link to="/shop">
            <Button variant="hero">Continue shopping</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  if (!allLinesMedusa) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">
            These items are not linked to Medusa product variants. Open products from the shop to add
            real catalogue lines, then try again.
          </p>
          <Link to="/cart">
            <Button variant="luxuryOutline">Back to cart</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative pt-28 pb-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(42 78% 52% / 0.07), transparent 55%)',
          }}
        />
        <div className="relative container mx-auto px-5 sm:px-6 max-w-6xl">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors mb-8 sm:mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to bag
          </Link>

          <header className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary/75 mb-4">
              Secure checkout
            </p>
            <h1 className="text-[2rem] sm:text-5xl md:text-[3.25rem] font-display font-medium leading-[1.08] text-foreground tracking-tight">
              Finalize{' '}
              <span className="font-editorial italic font-normal text-gold-gradient">acquisition</span>
            </h1>
            <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <p className="mt-5 text-sm text-muted-foreground/90 leading-relaxed max-w-md mx-auto">
              Complete shipping below. Payment is powered by Razorpay — sign in keeps your profile and order in sync.
            </p>
          </header>

          {!authLoading && !customer ? (
            <div className="glass-card p-8 rounded-sm text-center space-y-4 border border-white/[0.06]">
              <p className="text-muted-foreground">Sign in to pay securely with Razorpay.</p>
              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Sign in or create account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:gap-10 xl:gap-14 md:grid-cols-5 md:items-start">
              <div className="md:col-span-3 space-y-9 glass-card p-5 sm:p-8 md:p-9 rounded-sm border border-white/[0.07] bg-gradient-to-b from-card/90 to-card/40 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04] overflow-x-hidden">
                <header className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                    Shipping destination
                  </p>
                  <h2 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-foreground">
                    Where we deliver
                  </h2>
                  <p className="text-[13px] text-muted-foreground/88 leading-relaxed max-w-lg">
                    Same details go to Razorpay and your courier — edit anytime before you pay.
                  </p>
                </header>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Your details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fn" className="text-sm">
                        First name
                      </Label>
                      <Input
                        id="fn"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={CInput}
                        disabled={booting || busy}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ln" className="text-sm">
                        Last name
                      </Label>
                      <Input
                        id="ln"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={CInput}
                        disabled={booting || busy}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={CInput}
                      inputMode="tel"
                      placeholder="10-digit mobile"
                      disabled={booting || busy}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Delivery location
                    </h3>
                    <p className="text-[13px] leading-snug text-muted-foreground/80 mt-2">
                      Four steps — state through PIN.
                    </p>
                  </div>
                  <div className="rounded-sm border border-border/25 bg-muted/[0.07] p-4 sm:p-6 space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground block">
                        <span className="text-gold-gradient font-semibold">1.</span> State / UT
                      </Label>
                      <p className="text-[13px] leading-snug text-muted-foreground/88">
                        {googleMapsKey
                          ? addressVerifiedByGoogle
                            ? 'To change: clear the Google address in step 5 first.'
                            : 'Start here — then district, city, PIN, then street.'
                          : 'Start here — we validate PIN against this state.'}
                      </p>
                      <StateSearchCombobox
                        value={province}
                        onChange={onProvincePick}
                        disabled={booting || busy || Boolean(googleMapsKey && addressVerifiedByGoogle)}
                      />
                    </div>
                    {!(googleMapsKey && addressVerifiedByGoogle) ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground block">
                          <span className="text-gold-gradient font-semibold">2.</span> District
                        </Label>
                        <p className="text-[13px] leading-snug text-muted-foreground/88">
                          Search and pick from the list.
                        </p>
                        <DistrictSearchCombobox
                          district={district}
                          stateProvince={province}
                          onSuggestionPick={handleDistrictPick}
                          disabled={booting || busy}
                        />
                      </div>
                    ) : district.trim() ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground block">
                          <span className="text-gold-gradient font-semibold">2.</span> District
                        </Label>
                        <Input value={district} readOnly className={CInputRo} disabled={booting || busy} />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground block">
                        <span className="text-gold-gradient font-semibold">3.</span> City or town
                      </Label>
                      <p className="text-[13px] leading-snug text-muted-foreground/88">
                        {googleMapsKey
                          ? addressVerifiedByGoogle
                            ? 'From your Google address.'
                            : 'Search and select from suggestions.'
                          : 'Type at least 2 letters, then pick from the list.'}
                      </p>
                      {googleMapsKey && addressVerifiedByGoogle ? (
                        <Input value={city} readOnly className={CInputRo} disabled={booting || busy} />
                      ) : (
                        <CitySearchCombobox
                          city={city}
                          stateProvince={province}
                          district={district}
                          requireDistrict={Boolean(!googleMapsKey || !addressVerifiedByGoogle)}
                          onCityChange={onCityTyped}
                          onSuggestionPick={handleLocationPick}
                          disabled={booting || busy}
                          allowFreeTextCity={false}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pc" className="text-sm font-medium text-foreground">
                        <span className="text-gold-gradient font-semibold">4.</span> PIN (6 digits)
                      </Label>
                      {googleMapsKey && addressVerifiedByGoogle ? (
                        <Input
                          id="pc"
                          value={postalCode}
                          readOnly
                          className={CInputRo}
                          disabled={booting || busy}
                        />
                      ) : (
                        <Input
                          id="pc"
                          value={postalCode}
                          onChange={onPostalInputChange}
                          className={CInput}
                          inputMode="numeric"
                          maxLength={6}
                          disabled={booting || busy}
                        />
                      )}
                      {!googleMapsKey && postalCode.trim().length === 6 && province.trim() ? (
                        <p className="text-[13px] leading-snug mt-2 text-muted-foreground">
                          {pinLookup === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Checking PIN…
                            </span>
                          ) : pinLookup?.ok ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              OK — {pinLookup.state}
                              {pinLookup.district ? ` · ${pinLookup.district}` : ''}
                            </span>
                          ) : pinLookup && !pinLookup.ok ? (
                            <span className="text-destructive">
                              PIN not recognised for this state. Double-check digits.
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {!googleMapsKey &&
                      pinLookup !== 'loading' &&
                      pinLookup != null &&
                      pinLookup.ok &&
                      district.trim() &&
                      pinLookup.district &&
                      !districtFuzzyMatch(district, pinLookup.district) ? (
                        <p className="text-[13px] leading-snug mt-2 text-amber-600 dark:text-amber-400">
                          Directory says “{pinLookup.district}” — confirm district matches your PIN.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Street & suite
                  </h3>
                {googleMapsKey ? (
                  <div className="space-y-2 rounded-sm border border-border/25 bg-muted/[0.07] p-4 sm:p-6">
                    <GooglePlacesAddressField
                      apiKey={googleMapsKey}
                      id="addr"
                      label="5. Search street & building (India)"
                      value={address1}
                      onChange={setAddress1}
                      onResolved={handleGoogleAddressResolved}
                      onVerifiedChange={setAddressVerifiedByGoogle}
                      inputClassName={CGInput}
                      disabled={
                        booting ||
                        busy ||
                        !province.trim() ||
                        !district.trim() ||
                        !city.trim()
                      }
                    />
                    {!city.trim() || !province.trim() || !district.trim() ? (
                      <p className="text-[13px] leading-snug text-amber-600 dark:text-amber-400/90">
                        Finish steps 1–4, then search your building or road here.
                      </p>
                    ) : addressVerifiedByGoogle ? (
                      <p className="text-[13px] leading-snug text-emerald-600 dark:text-emerald-400">
                        Verified — add flat / tower below.
                      </p>
                    ) : (
                      <p className="text-[13px] leading-snug text-muted-foreground/90">
                        Choose a suggestion to continue.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-sm border border-border/25 bg-muted/[0.07] p-4 sm:p-6">
                    <Label htmlFor="addr" className="text-sm font-medium text-foreground block">
                      <span className="text-gold-gradient font-semibold">5.</span> Street address
                    </Label>
                    <p className="text-[13px] leading-snug text-muted-foreground/88">
                      Building number, road, area — at least 12 characters.
                    </p>
                    <Input
                      id="addr"
                      value={address1}
                      onChange={(e) => {
                        bumpGoogleVerification();
                        setAddress1(e.target.value);
                      }}
                      className={cn(
                        CInput,
                        address1.trim() && !streetLineValidation.ok
                          ? 'border-destructive/50 focus-visible:ring-destructive/25'
                          : '',
                      )}
                      disabled={booting || busy || !province.trim() || !district.trim() || !city.trim()}
                      autoComplete="street-address"
                      placeholder={
                        !province.trim() || !district.trim() || !city.trim()
                          ? 'Complete location steps above first'
                          : 'e.g. 12/3 Netaji Subhash Road'
                      }
                      aria-invalid={address1.trim() && !streetLineValidation.ok}
                    />
                    {address1.trim() && !streetLineValidation.ok ? (
                      <p className="text-[13px] text-destructive leading-snug">{streetLineValidation.message}</p>
                    ) : null}
                  </div>
                )}
                  <div className="space-y-2 rounded-sm border border-border/25 bg-muted/[0.07] p-4 sm:p-6">
                    <Label htmlFor="addr2" className="text-sm font-medium text-foreground block">
                      <span className="text-gold-gradient font-semibold">6.</span> Flat, floor, landmark
                    </Label>
                    <p className="text-[13px] leading-snug text-muted-foreground/88">
                      Minimum 3 characters (Flat 4B, Tower A, near…).
                    </p>
                    <Input
                      id="addr2"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      className={cn(
                        CInput,
                        address2.trim() && !landmarkValidation.ok
                          ? 'border-destructive/50 focus-visible:ring-destructive/25'
                          : '',
                      )}
                      disabled={booting || busy}
                      autoComplete="address-line2"
                      placeholder="Helps the courier find you"
                      aria-invalid={address2.trim() && !landmarkValidation.ok}
                    />
                    {address2.trim() && !landmarkValidation.ok ? (
                      <p className="text-[13px] text-destructive leading-snug">{landmarkValidation.message}</p>
                    ) : null}
                  </div>
                </section>

                <section className="space-y-3 rounded-sm border border-border/25 bg-muted/[0.07] p-4 sm:p-6">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Delivery speed
                  </h3>

                  {!addressComplete ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-muted-foreground leading-snug">
                        Choose standard or express here once your address passes validation. Fix anything
                        highlighted above first.
                      </p>
                      {addressDeliveryBlockers.length > 0 ? (
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[12px] font-medium text-foreground/90 [&::-webkit-details-marker]:hidden">
                            <span>Details ({addressDeliveryBlockers.length})</span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted-foreground">
                            {addressDeliveryBlockers.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  ) : shippingLoading && shippingOptions.length === 0 ? (
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      Loading delivery options…
                    </div>
                  ) : shippingError ? (
                    <p className="text-[13px] leading-snug text-destructive">{shippingError}</p>
                  ) : shippingOptions.length === 0 ? (
                    <p className="text-[13px] leading-snug text-muted-foreground">
                      No delivery options for this address. Check fulfillment and stock locations in Medusa
                      Admin, or try another PIN.
                    </p>
                  ) : (
                    <RadioGroup
                      value={selectedShippingOptionId ?? ''}
                      onValueChange={(id) => void handleShippingOptionChange(id)}
                      disabled={booting || busy || shippingLoading}
                      className="gap-3"
                    >
                      {shippingOptions.map((opt) => {
                        const linePrice =
                          opt.amountMinor <= 0
                            ? 'Free'
                            : formatPrice(medusaMinorToMajor(opt.amountMinor, currency), currency);
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              'flex items-start gap-3 rounded-sm border border-border/35 bg-background/30 px-3 py-3 transition-colors',
                              selectedShippingOptionId === opt.id && 'border-primary/40 bg-primary/[0.04]',
                            )}
                          >
                            <RadioGroupItem
                              value={opt.id}
                              id={`ship-opt-${opt.id}`}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <Label
                                htmlFor={`ship-opt-${opt.id}`}
                                className="cursor-pointer text-[13px] font-medium leading-snug text-foreground/95"
                              >
                                {opt.name}
                              </Label>
                              <p className="tabular-nums text-[12px] text-muted-foreground">{linePrice}</p>
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                </section>

              </div>

              <div className="md:col-span-2 glass-card p-4 sm:p-6 md:p-7 rounded-sm border border-white/[0.08] bg-gradient-to-b from-card/95 to-background/55 h-fit md:sticky md:top-28 flex flex-col gap-5 sm:gap-6 shadow-[0_28px_90px_-40px_rgba(0,0,0,0.9)] ring-1 ring-primary/[0.06] min-w-0 overflow-x-visible">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80 mb-1.5">
                    Your selection
                  </p>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Curation summary
                  </h2>
                </div>

                <ul className="space-y-5 text-sm border-b border-border/20 pb-6">
                  {localCart.map((item) => {
                    const cc = item.product.currencyCode ?? currency;
                    const unit = item.product.price;
                    const line = unit * item.quantity;
                    const thumb = item.product.image?.trim() || '/placeholder.svg';
                    return (
                      <li
                        key={cartItemLineKey(item)}
                        className="flex gap-3 sm:gap-4 items-start min-w-0"
                      >
                        <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-sm overflow-hidden border border-border/35 bg-muted/30 ring-1 ring-white/[0.04]">
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5 space-y-1.5 w-full">
                          <div className="min-w-0 md:flex md:justify-between md:items-start md:gap-3">
                            <span className="block text-[12px] sm:text-sm font-medium text-foreground/95 leading-snug uppercase tracking-[0.04em] break-words min-w-0 md:line-clamp-2 md:flex-1 md:pr-1">
                              {item.product.name}
                            </span>
                            <span className="hidden tabular-nums text-foreground font-semibold text-[12px] sm:text-sm leading-tight whitespace-nowrap shrink-0 text-right md:block">
                              {formatPrice(line, cc)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline gap-2 min-w-0">
                            <p className="text-[11px] text-muted-foreground tabular-nums min-w-0 pr-2">
                              Qty {item.quantity} · {formatPrice(unit, cc)} each
                            </p>
                            <span className="tabular-nums text-foreground font-semibold text-[12px] sm:text-sm whitespace-nowrap shrink-0 md:hidden">
                              {formatPrice(line, cc)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {customer && isMedusaConfigured() && localCart.length > 0 ? (
                  <div className="space-y-4">
                    <CheckoutCouponSection
                      appliedCoupons={appliedCouponDisplays}
                      availableOffers={scrollableManualOffers}
                      catalogLoading={promotionCatalogLoading}
                      currencyLabel={currency}
                      deliveryOptionCommitted={showCommittedShippingLine}
                      disabled={booting || busy}
                      promoBusy={promoBusy}
                      applyingCode={applyingCode}
                      promoInput={promoInput}
                      onPromoInputChange={setPromoInput}
                      onApplyCode={(c) => void applyPromotionByCode(c)}
                      onApplyManual={applyPromotionCode}
                      onRemoveCode={(c) => void removePromotionCode(c)}
                    />
                  </div>
                ) : null}

                <div className="rounded-sm border border-border/20 bg-background-elevated/25 px-4 py-5 space-y-3 text-sm">
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 items-baseline">
                    <span className="text-muted-foreground text-[13px]">Subtotal</span>
                    <span className="tabular-nums text-right font-medium">{formatPrice(itemSubtotalMajor, currency)}</span>
                    {discountMajor > 0 ? (
                      shippingOnlyDiscountPending ? (
                        <>
                          <span className="text-emerald-600 dark:text-emerald-400">Discount</span>
                          <span
                            className="text-[13px] text-right text-muted-foreground leading-snug max-w-[11rem] ml-auto"
                            title="Delivery savings apply once you pick a delivery option below."
                          >
                            After delivery
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 dark:text-emerald-400">Discount</span>
                          <span className="tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                            −{formatPrice(discountMajor, currency)}
                          </span>
                        </>
                      )
                    ) : null}
                    {shippingMajorForSummary != null && shippingMajorForSummary > 0 ? (
                      <>
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="tabular-nums text-right">
                          {formatPrice(shippingMajorForSummary, currency)}
                        </span>
                      </>
                    ) : shippingMajorForSummary != null && shippingMajorForSummary === 0 ? (
                      <>
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                          Free
                        </span>
                      </>
                    ) : serverCart ? (
                      <>
                        <span className="text-muted-foreground">Shipping</span>
                        <span
                          className="tabular-nums text-right text-muted-foreground"
                          title="We add delivery cost after your address and delivery option are set."
                        >
                          After delivery
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="tabular-nums text-right text-muted-foreground">—</span>
                      </>
                    )}
                    {taxMajor != null && taxMajor > 0 ? (
                      <>
                        <span className="text-muted-foreground">Tax</span>
                        <span className="tabular-nums text-right">{formatPrice(taxMajor, currency)}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-x-4 pt-4 mt-1 border-t border-border/30 items-baseline">
                    <span className="font-display text-sm font-semibold text-foreground">Amount due</span>
                    <span className="font-display text-lg font-semibold text-gold-gradient tabular-nums text-right">
                      {formatPrice(estimatedPayTotalMajor, currency)}
                    </span>
                  </div>
                  {!checkoutPayReady && serverCart ? (
                    <p className="text-[11px] text-muted-foreground/90 leading-snug">
                      Delivery cost is not included until you pick a delivery speed below.
                    </p>
                  ) : null}
                </div>

                <Button
                  variant="hero"
                  size="xl"
                  className="w-full h-14 font-semibold uppercase tracking-[0.2em] text-xs sm:text-sm rounded-sm shadow-[0_8px_32px_-8px_rgba(212,175,55,0.45)]"
                  disabled={booting || busy || !customer || !checkoutPayReady}
                  onClick={() => void runCheckout()}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing…
                    </>
                  ) : (
                    'Finalize — Razorpay'
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground/80 text-center leading-relaxed px-1">
                  Subtotal and offers update live. Delivery cost appears after you finish your address and pick
                  a speed.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
