import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

/** Set `MEDUSA_DISABLE_AUTO_PRODUCT_HANDLE=true` to skip normalization / uniqueness. */
export function autoProductHandleEnabled(): boolean {
  return process.env.MEDUSA_DISABLE_AUTO_PRODUCT_HANDLE !== "true";
}

/** URL-safe handle from title or messy admin input. */
export function slugifyProductHandle(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

function idSuffix(productId: string): string {
  const alnum = productId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return alnum.slice(-6) || "x";
}

type ProductRow = { id: string; handle?: string | null; title?: string | null };

function reservedHandlesLower(
  catalogue: ProductRow[],
  excludeId: string,
): Set<string> {
  const set = new Set<string>();
  for (const r of catalogue) {
    if (!r.id || r.id === excludeId) continue;
    const h = (r.handle ?? "").trim().toLowerCase();
    if (h) set.add(h);
  }
  return set;
}

function pickUniqueHandle(base: string, taken: Set<string>, productId: string): string {
  let candidate = base;
  if (!taken.has(candidate.toLowerCase())) return candidate;

  candidate = `${base}-${idSuffix(productId)}`;
  if (!taken.has(candidate.toLowerCase())) return candidate;

  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * Ensures product.handle is non-empty, slug-safe, and unique across the catalogue.
 */
export async function ensureProductHandleUnique(
  container: ExecArgs["container"],
  productId: string,
): Promise<void> {
  if (!autoProductHandleEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: one } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
    filters: { id: productId },
  });
  const row = one?.[0] as ProductRow | undefined;
  if (!row?.id) return;

  const { data: all } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const catalogue = (all ?? []) as ProductRow[];

  const title = (row.title ?? "").trim();
  const current = (row.handle ?? "").trim();
  const base = slugifyProductHandle(current || title || "product");
  const taken = reservedHandlesLower(catalogue, productId);
  const desired = pickUniqueHandle(base, taken, productId);

  if (current === desired) return;

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: productId },
      update: { handle: desired },
    },
  });

  logger.info(`[product-handle] ${productId} → handle "${desired}"`);
}
