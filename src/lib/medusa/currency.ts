/**
 * Medusa stores amounts in the smallest currency unit (paise for INR). Convert to major units
 * for `Intl` / `formatPrice` and for comparing with metadata entered in rupees.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function medusaMinorToMajor(amount: number, currencyCode: string): number {
  const c = currencyCode.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return amount;
  return amount / 100;
}

/**
 * Storefront catalogue prices are in **major** units (e.g. rupees). Medusa cart `unit_price` uses
 * smallest currency units (paise). Use when pushing bundle/hamper totals to the server cart.
 */
export function storefrontMajorPriceToMedusaMinor(
  major: number,
  currencyCode: string | undefined,
): number {
  const c = (currencyCode ?? 'INR').toUpperCase();
  if (!Number.isFinite(major) || major < 0) return 0;
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return Math.round(major);
  return Math.round(major * 100);
}

/**
 * Strict Medusa is the default: INR API amounts are **paise**, always ÷ 100 for display.
 * Set `VITE_MEDUSA_INR_AMBIGUOUS_HEURISTIC=true` only if you still have legacy rows where the
 * minor field was saved as whole rupees and need the old compare-at-MRP ratio guess (can break
 * PDP/cart vs checkout when MRP is large and the real price is small in paise).
 */
function inrAmbiguousHeuristicEnabled(): boolean {
  const v = import.meta.env.VITE_MEDUSA_INR_AMBIGUOUS_HEURISTIC?.trim().toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * INR: API amounts are normally **paise**. If a variant was saved wrong so the API integer looks
 * like **rupees** (e.g. 5000 meaning ₹5,000) while metadata `compare_at_price` is a large MRP in
 * rupees, dividing by 100 would show ₹50 vs ₹3,20,000 MRP — clearly inconsistent. In that case we
 * treat the raw integer as **rupees** for display only. Correct Medusa rows (e.g. 5,000,000 paise
 * for ₹50,000) are unchanged because the absurd MRP ratio test does not fire.
 *
 * @param compareAtMRP — product/variant metadata `compare_at_price` (rupees), if any
 */
export function inrStoreAmountToDisplayRupees(
  amountMinorOrAmbiguous: number,
  compareAtMRP: number | undefined,
): number {
  const minor = medusaMinorToMajor(amountMinorOrAmbiguous, 'INR');
  if (!inrAmbiguousHeuristicEnabled()) return minor;
  if (
    compareAtMRP == null ||
    !Number.isFinite(compareAtMRP) ||
    compareAtMRP <= 0 ||
    amountMinorOrAmbiguous <= 0
  ) {
    return minor;
  }
  // Only ambiguous “small” API integers (Admin sometimes saves rupees in the minor field by mistake).
  if (amountMinorOrAmbiguous <= 1000 || amountMinorOrAmbiguous >= 1_000_000) {
    return minor;
  }
  const ratio = compareAtMRP / Math.max(minor, 0.01);
  // 8k catches "2000 as ₹2000" vs MRP (ratio ~16k) but not "5000 paise = ₹50" vs MRP (ratio ~6.4k).
  if (ratio > 8_000) {
    return amountMinorOrAmbiguous;
  }
  return minor;
}

/**
 * Cart line items: unit_price / subtotals are in Medusa minor units. When INR heuristic adjusts the
 * unit (rupees saved as minor by mistake), recompute line total from unit × qty instead of trusting
 * API line subtotal.
 */
export function inrLineItemDisplayFromUnitAndLineMinor(
  unitPriceMinor: number,
  quantity: number,
  lineSubtotalMinor: number | undefined,
  itemSubtotalMinor: number | undefined,
  compareAtMRP: number | undefined,
): { unitMajor: number; lineMajor: number } {
  const unitDisplay = inrStoreAmountToDisplayRupees(unitPriceMinor, compareAtMRP);
  const unitAsMinor = medusaMinorToMajor(unitPriceMinor, 'INR');
  const heuristic = Math.abs(unitDisplay - unitAsMinor) > 1e-9;
  const lineMinor = lineSubtotalMinor ?? itemSubtotalMinor ?? unitPriceMinor * quantity;
  const lineMajor = heuristic
    ? unitDisplay * quantity
    : medusaMinorToMajor(lineMinor, 'INR');
  return { unitMajor: unitDisplay, lineMajor };
}
