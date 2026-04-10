import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { autoSkuEnabled, ensureVariantSku } from "../lib/auto-variant-sku";

type ProductModuleLike = {
  listAndCountProductVariants: (
    filters?: Record<string, never>,
    config?: { take?: number; skip?: number },
  ) => Promise<[{ id: string }[], number]>;
};

/**
 * One-off: set SKU on variants that still have an empty SKU (same rules as subscribers).
 *
 * Usage (from /backend): `npm run backfill:variant-sku`
 */
export default async function backfillVariantSku({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (!autoSkuEnabled()) {
    logger.warn("[backfill-variant-sku] Skipped: MEDUSA_DISABLE_AUTO_SKU is true.");
    return;
  }

  const productModule = container.resolve("product") as ProductModuleLike;
  const take = 500;
  let skip = 0;
  let done = 0;

  for (;;) {
    const [rows, count] = await productModule.listAndCountProductVariants(
      {},
      { take, skip },
    );
    if (!rows.length) break;
    for (const row of rows) {
      await ensureVariantSku(container, row.id);
      done += 1;
    }
    skip += rows.length;
    if (skip >= count) break;
  }

  logger.info(`[backfill-variant-sku] Processed ${done} variant(s).`);
}
