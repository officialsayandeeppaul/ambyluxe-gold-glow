import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  syncAllVariantsPhysicalFromProduct,
  syncVariantPhysicalEnabled,
} from "../lib/sync-variant-physical-from-product";

/**
 * One-off: copy product-level weight/dimensions/origin/material onto variants that still have them empty.
 *
 * Usage (from /backend): `npm run backfill:variant-physical`
 */
export default async function backfillVariantPhysical({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  if (!syncVariantPhysicalEnabled()) {
    logger.warn(
      "[backfill-variant-physical] Skipped: MEDUSA_DISABLE_SYNC_VARIANT_PHYSICAL is true.",
    );
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
  });

  let n = 0;
  for (const row of products ?? []) {
    const id = (row as { id?: string }).id;
    if (!id) continue;
    await syncAllVariantsPhysicalFromProduct(container, id);
    n += 1;
  }
  logger.info(`[backfill-variant-physical] Processed ${n} product(s).`);
}
