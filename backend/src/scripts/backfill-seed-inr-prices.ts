import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import {
  SEED_CATALOG_INR_RUPEES_BY_SKU,
  inrPaiseFromRupeesMajor,
} from "../lib/seed-catalog-inr-prices";

type ProductModuleLike = {
  listProductVariants: (
    filters: { sku: string[] },
    config?: { take?: number },
  ) => Promise<Array<{ id: string; sku: string | null }>>;
};

/**
 * Restores INR variant prices to match `seed.ts` (paise from catalogue rupees).
 * Use when Admin or imports left wrong amounts (e.g. 5000 paise = ₹50 instead of ₹2,85,000).
 *
 * Usage (from /backend): `npm run backfill:seed-inr-prices`
 */
export default async function backfillSeedInrPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve("product") as ProductModuleLike;

  const skus = Object.keys(SEED_CATALOG_INR_RUPEES_BY_SKU);
  const variants = await productModule.listProductVariants({ sku: skus }, { take: skus.length });

  const product_variants: { id: string; prices: { amount: number; currency_code: string }[] }[] =
    [];

  for (const v of variants) {
    const sku = v.sku?.trim();
    if (!sku) continue;
    const rupees = SEED_CATALOG_INR_RUPEES_BY_SKU[sku];
    if (rupees == null) continue;
    product_variants.push({
      id: v.id,
      prices: [{ amount: inrPaiseFromRupeesMajor(rupees), currency_code: "inr" }],
    });
  }

  const missing = skus.filter((s) => !variants.some((x) => x.sku?.trim() === s));
  if (missing.length) {
    logger.warn(
      `[backfill-seed-inr-prices] No variant found for SKU(s): ${missing.join(", ")}`,
    );
  }

  if (!product_variants.length) {
    logger.warn("[backfill-seed-inr-prices] No matching variants to update.");
    return;
  }

  await updateProductVariantsWorkflow(container).run({
    input: { product_variants },
  });

  logger.info(
    `[backfill-seed-inr-prices] Updated ${product_variants.length} variant(s) to seed INR prices.`,
  );
}
