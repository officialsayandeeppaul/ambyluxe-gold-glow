import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateCollectionsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import {
  LOCALHOST_IMG_PREFIXES,
  getStorefrontImageBase,
  rewriteLocalhostOriginsToBase,
  stringLooksLikeSeededLocalhostUrl,
} from "../lib/seed-storefront-base";

function deepRewriteLocalhostUrls(value: unknown, base: string): unknown {
  if (typeof value === "string") {
    return rewriteLocalhostOriginsToBase(value, base);
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepRewriteLocalhostUrls(v, base));
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      next[k] = deepRewriteLocalhostUrls(o[k], base);
    }
    return next;
  }
  return value;
}

type ProductModuleLike = {
  listProducts: (
    filters: Record<string, never>,
    config: { relations: string[]; take: number },
  ) => Promise<
    Array<{
      id: string;
      handle?: string | null;
      metadata?: Record<string, unknown> | null;
      images?: Array<{ url?: string | null }> | null;
    }>
  >;
};

/**
 * Rewrites seeded image URLs (localhost / 127.0.0.1, any port) to production storefront base.
 * Uses STORE_PUBLIC_URL or SEED_STOREFRONT_BASE_URL (see `seed-storefront-base.ts`).
 *
 * Uses `listProducts` + `images` relation (graph + `filters: {}` can return 0 rows in some setups).
 */
export default async function backfillSeedStorefrontUrls({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve("product") as ProductModuleLike;
  const base = getStorefrontImageBase();

  if (LOCALHOST_IMG_PREFIXES.some((p) => base.startsWith(p) || base.includes("localhost"))) {
    logger.error(
      "[backfill-seed-storefront-urls] Set STORE_PUBLIC_URL or SEED_STOREFRONT_BASE_URL to your live storefront (e.g. https://www.sayandeep.store), not localhost.",
    );
    return;
  }

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "metadata"],
  });

  logger.info(
    `[backfill-seed-storefront-urls] Loaded ${(collections ?? []).length} collection(s) from graph.`,
  );

  let colUpdated = 0;
  for (const c of collections ?? []) {
    const meta = c.metadata as Record<string, unknown> | null | undefined;
    if (!meta || typeof meta !== "object") continue;
    const nextMeta = deepRewriteLocalhostUrls(meta, base) as Record<string, unknown>;
    if (JSON.stringify(meta) === JSON.stringify(nextMeta)) continue;
    await updateCollectionsWorkflow(container).run({
      input: {
        selector: { id: c.id },
        update: { metadata: nextMeta },
      },
    });
    colUpdated += 1;
    logger.info(`[backfill-seed-storefront-urls] collection ${c.handle ?? c.id} metadata updated`);
  }

  const products = await productModule.listProducts(
    {},
    { relations: ["images"], take: 10_000 },
  );

  logger.info(`[backfill-seed-storefront-urls] Loaded ${products.length} product(s) via product module.`);

  let prodUpdated = 0;
  for (const p of products) {
    const images = p.images ?? [];
    const meta = p.metadata;

    const metaNext =
      meta && typeof meta === "object"
        ? (deepRewriteLocalhostUrls(meta, base) as Record<string, unknown>)
        : meta;
    const metaChanged =
      meta && typeof meta === "object"
        ? JSON.stringify(meta) !== JSON.stringify(metaNext)
        : false;

    const imgChanged = images.some((img) => {
      const u = img.url?.trim() ?? "";
      return Boolean(u && stringLooksLikeSeededLocalhostUrl(u));
    });

    if (!imgChanged && !metaChanged) continue;

    const updatePayload: {
      metadata?: Record<string, unknown>;
      images?: { url: string }[];
    } = {};
    if (metaChanged && metaNext && typeof metaNext === "object") {
      updatePayload.metadata = metaNext;
    }
    if (imgChanged) {
      updatePayload.images = images
        .map((img) => {
          const u = img.url?.trim() ?? "";
          return { url: u ? rewriteLocalhostOriginsToBase(u, base) : u };
        })
        .filter((row) => row.url);
    }

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: p.id },
        update: updatePayload,
      },
    });
    prodUpdated += 1;
    logger.info(`[backfill-seed-storefront-urls] product ${p.handle ?? p.id} updated`);
  }

  logger.info(
    `[backfill-seed-storefront-urls] Done. Collections updated: ${colUpdated}, products updated: ${prodUpdated}. Base: ${base}`,
  );
}
