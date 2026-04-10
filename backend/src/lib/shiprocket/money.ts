/** Match storefront `medusaMinorToMajor`: Medusa stores smallest currency units (paise for INR). */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function medusaAmountToMajor(
  minor: number,
  currencyCode: string,
): number {
  const c = currencyCode.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return minor;
  return minor / 100;
}

export function roundRupees(n: number): number {
  return Math.round(n);
}
