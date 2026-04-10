import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  autoProductHandleEnabled,
  ensureProductHandleUnique,
} from "../lib/product-handle";

/**
 * One-off: slugify and dedupe every product handle (same rules as subscribers).
 *
 * Usage (from /backend): `npm run backfill:product-handles`
 */
export default async function backfillProductHandles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (!autoProductHandleEnabled()) {
    logger.warn(
      "[backfill-product-handles] Skipped: MEDUSA_DISABLE_AUTO_PRODUCT_HANDLE is true.",
    );
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
  });

  let n = 0;
  for (const row of data ?? []) {
    const id = (row as { id?: string }).id;
    if (!id) continue;
    await ensureProductHandleUnique(container, id);
    n += 1;
  }

  logger.info(`[backfill-product-handles] Processed ${n} product(s).`);
}
