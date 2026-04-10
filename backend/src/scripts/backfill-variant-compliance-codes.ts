import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  autoComplianceCodesEnabled,
  ensureProductComplianceCodes,
  ensureVariantComplianceCodes,
} from "../lib/compliance-codes";

type ProductModuleLike = {
  listAndCountProducts: (
    filters?: Record<string, never>,
    config?: { take?: number; skip?: number },
  ) => Promise<[{ id: string }[], number]>;
  listAndCountProductVariants: (
    filters?: Record<string, never>,
    config?: { take?: number; skip?: number },
  ) => Promise<[{ id: string }[], number]>;
};

/**
 * One-off: auto HS/MID on every product (parent) and variant (child derived from parent id).
 * Replaces manual Admin values.
 *
 * Usage (from /backend): `npm run backfill:variant-codes`
 */
export default async function backfillComplianceCodes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (!autoComplianceCodesEnabled()) {
    logger.warn(
      "[backfill-compliance-codes] Skipped: MEDUSA_DISABLE_AUTO_VARIANT_COMPLIANCE_CODES is true.",
    );
    return;
  }

  const productModule = container.resolve("product") as ProductModuleLike;
  const take = 500;

  let pSkip = 0;
  let productsDone = 0;
  for (;;) {
    const [rows, count] = await productModule.listAndCountProducts({}, { take, skip: pSkip });
    if (!rows.length) break;
    for (const row of rows) {
      await ensureProductComplianceCodes(container, row.id);
      productsDone += 1;
    }
    pSkip += rows.length;
    if (pSkip >= count) break;
  }

  let vSkip = 0;
  let variantsDone = 0;
  for (;;) {
    const [rows, count] = await productModule.listAndCountProductVariants(
      {},
      { take, skip: vSkip },
    );
    if (!rows.length) break;
    for (const row of rows) {
      await ensureVariantComplianceCodes(container, row.id);
      variantsDone += 1;
    }
    vSkip += rows.length;
    if (vSkip >= count) break;
  }

  logger.info(
    `[backfill-compliance-codes] Products: ${productsDone}, variants: ${variantsDone}.`,
  );
}
