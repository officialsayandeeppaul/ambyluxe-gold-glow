import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/** Set `MEDUSA_DISABLE_AUTO_VARIANT_COMPLIANCE_CODES=true` to turn off subscribers + scripts. */
export function autoComplianceCodesEnabled(): boolean {
  return process.env.MEDUSA_DISABLE_AUTO_VARIANT_COMPLIANCE_CODES !== "true";
}

/** @deprecated use autoComplianceCodesEnabled */
export const autoVariantComplianceCodesEnabled = autoComplianceCodesEnabled;

export function idCore(medusaId: string, maxLen: number): string {
  const alnum = medusaId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return alnum.slice(-maxLen) || alnum;
}

/** Product-level “parent” codes (Medusa Product.hs_code / Product.mid_code). */
export function complianceCodesForProduct(productId: string): {
  hs_code: string;
  mid_code: string;
} {
  const p = idCore(productId, 20);
  return { hs_code: `HS-${p}`, mid_code: `MID-${p}` };
}

/**
 * Variant “child” codes: same parent stem as the product, plus a short suffix from the variant id
 * so every SKU is unique but derived from the parent.
 */
export function complianceCodesForVariant(productId: string, variantId: string): {
  hs_code: string;
  mid_code: string;
} {
  const p = idCore(productId, 20);
  const v = idCore(variantId, 10);
  return { hs_code: `HS-${p}-${v}`, mid_code: `MID-${p}-${v}` };
}

type ProductModuleLike = {
  retrieveProduct: (
    id: string,
  ) => Promise<{ id: string; hs_code?: string | null; mid_code?: string | null }>;
  retrieveProductVariant: (
    id: string,
  ) => Promise<{
    id: string;
    product_id?: string | null;
    hs_code?: string | null;
    mid_code?: string | null;
  }>;
};

export async function ensureProductComplianceCodes(
  container: ExecArgs["container"],
  productId: string,
): Promise<void> {
  if (!autoComplianceCodesEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve("product") as ProductModuleLike;

  let p: { id: string; hs_code?: string | null; mid_code?: string | null };
  try {
    p = await productModule.retrieveProduct(productId);
  } catch {
    return;
  }
  if (!p) return;

  const { hs_code, mid_code } = complianceCodesForProduct(productId);
  if ((p.hs_code ?? "") === hs_code && (p.mid_code ?? "") === mid_code) return;

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: productId },
      update: { hs_code, mid_code },
    },
  });

  logger.info(`[compliance-codes] Set product HS/MID for ${productId}`);
}

export async function ensureVariantComplianceCodes(
  container: ExecArgs["container"],
  variantId: string,
): Promise<void> {
  if (!autoComplianceCodesEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModule = container.resolve("product") as ProductModuleLike;

  let v: {
    id: string;
    product_id?: string | null;
    hs_code?: string | null;
    mid_code?: string | null;
  };
  try {
    v = await productModule.retrieveProductVariant(variantId);
  } catch {
    return;
  }
  if (!v) return;

  const productId = v.product_id;
  if (!productId) {
    logger.warn(`[compliance-codes] Variant ${variantId} has no product_id; skipping`);
    return;
  }

  const { hs_code, mid_code } = complianceCodesForVariant(productId, variantId);
  if ((v.hs_code ?? "") === hs_code && (v.mid_code ?? "") === mid_code) return;

  await updateProductVariantsWorkflow(container).run({
    input: {
      selector: { id: variantId },
      update: { hs_code, mid_code },
    },
  });

  logger.info(`[compliance-codes] Set variant HS/MID for ${variantId} (product ${productId})`);
}
