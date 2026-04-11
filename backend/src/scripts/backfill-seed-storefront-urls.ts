import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateCollectionsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import {
  LOCALHOST_IMG_PREFIXES,
  getStorefrontImageBase,
} from "../lib/seed-storefront-base";

function rewriteUrlsInString(s: string, base: string): string {
  let out = s;
  for (const prefix of LOCALHOST_IMG_PREFIXES) {
    out = out.split(prefix).join(base);
  }
  return out;
}

function rewriteMetadata(meta: Record<string, unknown> | null | undefined, base: string): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object") return meta ?? null;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") {
      next[k] = rewriteUrlsInString(v, base);
    } else {
      next[k] = v;
    }
  }
  return next;
}

/**
 * Rewrites seeded image URLs (localhost:8080 / :9000) to production storefront base.
 * Uses STORE_PUBLIC_URL or SEED_STOREFRONT_BASE_URL (see `seed-storefront-base.ts`).
 *
 * Usage (from /backend): `npm run backfill:seed-storefront-urls`
 * Production (Docker): `npm run backfill:seed-storefront-urls:prod` via medusa-exec-server cwd
 */
export default async function backfillSeedStorefrontUrls({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
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
    filters: {},
  });

  let colUpdated = 0;
  for (const c of collections ?? []) {
    const meta = c.metadata as Record<string, unknown> | null | undefined;
    if (!meta) continue;
    const raw = JSON.stringify(meta);
    const replaced = rewriteUrlsInString(raw, base);
    if (replaced === raw) continue;
    const newMeta = JSON.parse(replaced) as Record<string, unknown>;
    await updateCollectionsWorkflow(container).run({
      input: {
        selector: { id: c.id },
        update: { metadata: newMeta },
      },
    });
    colUpdated += 1;
    logger.info(`[backfill-seed-storefront-urls] collection ${c.handle ?? c.id} metadata updated`);
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "images.url"],
    filters: {},
  });

  let prodUpdated = 0;
  for (const p of products ?? []) {
    const images = (p as { images?: { url?: string | null }[] }).images ?? [];
    const meta = p.metadata as Record<string, unknown> | null | undefined;

    const metaNext = rewriteMetadata(meta, base);
    const metaChanged = JSON.stringify(meta ?? {}) !== JSON.stringify(metaNext ?? {});

    const imgChanged = images.some((img) => {
      const u = img.url?.trim() ?? "";
      return Boolean(u && LOCALHOST_IMG_PREFIXES.some((p) => u.startsWith(p)));
    });

    if (!imgChanged && !metaChanged) continue;

    const updatePayload: {
      metadata?: Record<string, unknown>;
      images?: { url: string }[];
    } = {};
    if (metaChanged && metaNext) updatePayload.metadata = metaNext;
    if (imgChanged) {
      updatePayload.images = images
        .map((img) => {
          const u = img.url?.trim() ?? "";
          return { url: u ? rewriteUrlsInString(u, base) : u };
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
    logger.info(`[backfill-seed-storefront-urls] product ${(p as { handle?: string }).handle ?? p.id} updated`);
  }

  logger.info(
    `[backfill-seed-storefront-urls] Done. Collections updated: ${colUpdated}, products updated: ${prodUpdated}. Base: ${base}`,
  );
}
