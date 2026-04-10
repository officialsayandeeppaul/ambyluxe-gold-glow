/**
 * Demo catalogue: INR shelf price in **rupees (major)** by variant SKU.
 * Must stay in sync with `src/scripts/seed.ts` `oneSizeVariant(..., rupeesMajor)`.
 */
export const SEED_CATALOG_INR_RUPEES_BY_SKU: Record<string, number> = {
  "AMB-RING-ETERNAL-001": 285000,
  "AMB-NECK-ROYAL-001": 425000,
  "AMB-EAR-CELEST-001": 95000,
  "AMB-BANG-MAHAR-001": 1850000,
  "AMB-PEND-AURORA-001": 165000,
  "AMB-BRAC-INF-001": 245000,
  "AMB-RING-SAPH-001": 195000,
  "AMB-EAR-CASCADE-001": 125000,
};

/** Medusa stores INR amounts in paise (1/100 rupee). */
export function inrPaiseFromRupeesMajor(rupeesMajor: number): number {
  return Math.round(rupeesMajor * 100);
}
