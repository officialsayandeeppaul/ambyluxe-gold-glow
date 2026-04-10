import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import { idCore } from "./compliance-codes";

/** Set `MEDUSA_DISABLE_AUTO_SKU=true` to skip auto SKU on create/update. */
export function autoSkuEnabled(): boolean {
  return process.env.MEDUSA_DISABLE_AUTO_SKU !== "true";
}

/**
 * Deterministic, unique SKU from Medusa ids (no admin input).
 * Format: AMB-{productCore}-{variantCore} — same product shares the left segment.
 */
export function skuForVariant(productId: string, variantId: string): string {
  const p = idCore(productId, 10);
  const v = idCore(variantId, 10);
  return `AMB-${p}-${v}`;
}

type ProductModuleLike = {
  retrieveProductVariant: (
    id: string,
  ) => Promise<{
    id: string;
    product_id?: string | null;
    sku?: string | null;
  }>;
};

/** Sets SKU only when missing or whitespace; preserves merchant-entered SKUs. */
export async function ensureVariantSku(
  container: ExecArgs["container"],
  variantId: string,
): Promise<void> {
  if (!autoSkuEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve("product") as ProductModuleLike;

  let v: {
    id: string;
    product_id?: string | null;
    sku?: string | null;
  };
  try {
    v = await productModule.retrieveProductVariant(variantId);
  } catch {
    return;
  }
  if (!v) return;

  if ((v.sku ?? "").trim() !== "") return;

  const productId = v.product_id;
  if (!productId) {
    logger.warn(`[auto-sku] Variant ${variantId} has no product_id; skipping`);
    return;
  }

  const sku = skuForVariant(productId, variantId);

  await updateProductVariantsWorkflow(container).run({
    input: {
      selector: { id: variantId },
      update: { sku },
    },
  });

  logger.info(`[auto-sku] Set SKU for variant ${variantId}: ${sku}`);
}
