import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  batchLinkProductsToCollectionWorkflow,
  createCollectionsWorkflow,
  updateCollectionsWorkflow,
} from "@medusajs/medusa/core-flows";

/** Same base as seed — hero image URLs for the storefront. */
const STOREFRONT_IMG_BASE =
  (typeof process !== "undefined" &&
    process.env?.SEED_STOREFRONT_BASE_URL?.replace(/\/$/, "")) ||
  "http://localhost:8080";

function storefrontProductImage(filename: string): string {
  return `${STOREFRONT_IMG_BASE}/images/products/${filename}`;
}

type ColDef = {
  handle: string;
  title: string;
  metadata: Record<string, string>;
  productHandles: string[];
};

const JEWELLERY_COLLECTIONS: ColDef[] = [
  {
    handle: "timeless",
    title: "Timeless",
    metadata: {
      storefront_tagline: "Enduring Elegance",
      storefront_short:
        "Classic designs that transcend trends and become heirlooms passed down through generations.",
      storefront_long:
        "Masterpieces that defy the passage of time. Each piece in our Timeless collection is designed to become an heirloom — a bridge between generations, carrying stories of love and legacy.",
      hero_image: storefrontProductImage("product-bracelet.jpg"),
      sort_order: "1",
      storefront_home: "true",
    },
    productHandles: [
      "eternal-diamond-solitaire",
      "infinity-tennis-bracelet",
      "golden-cascades-earrings",
    ],
  },
  {
    handle: "heritage",
    title: "Heritage",
    metadata: {
      storefront_tagline: "Royal Legacy",
      storefront_short:
        "Inspired by centuries of Indian craftsmanship and regal traditions.",
      storefront_long:
        "Born from centuries of Indian royal craftsmanship, the Heritage collection honours tradition while embracing contemporary sophistication. Every piece tells the story of emperors and artisans.",
      hero_image: storefrontProductImage("product-bangles.jpg"),
      sort_order: "2",
    },
    productHandles: [
      "royal-heritage-necklace",
      "maharani-bangles-set",
      "sapphire-cocktail-ring",
    ],
  },
  {
    handle: "celestial",
    title: "Celestial",
    metadata: {
      storefront_tagline: "Cosmic Radiance",
      storefront_short:
        "Ethereal pieces inspired by the magic of the cosmos and celestial wonders.",
      storefront_long:
        "Inspired by the infinite beauty of the cosmos — the shimmer of distant stars, the glow of the moon, the aurora of twilight. The Celestial collection captures the ethereal in precious form.",
      hero_image: storefrontProductImage("product-pendant.jpg"),
      sort_order: "3",
      storefront_home: "true",
    },
    productHandles: ["celestial-pearl-drops", "aurora-diamond-pendant"],
  },
];

type CollectionRow = {
  id: string;
  handle?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ProductRow = { id: string; handle?: string | null };

/**
 * Adds Amby Luxe jewellery collections + metadata and links products by **handle**.
 * Safe on existing DBs: skips creating a collection if the handle already exists; updates
 * storefront metadata keys; merges product links (does not remove other products).
 *
 * Usage (from /backend): `npm run ensure:collections`
 */
export default async function ensureCollections({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existingCols } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title", "metadata"],
  });
  const byHandle = new Map<string, CollectionRow>();
  for (const c of (existingCols ?? []) as CollectionRow[]) {
    if (c.handle) byHandle.set(c.handle, c);
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const productIdByHandle = new Map<string, string>();
  for (const p of (existingProducts ?? []) as ProductRow[]) {
    if (p.handle) productIdByHandle.set(p.handle, p.id);
  }

  const toCreate: { title: string; handle: string; metadata: Record<string, string> }[] =
    [];

  for (const def of JEWELLERY_COLLECTIONS) {
    const existing = byHandle.get(def.handle);
    if (!existing) {
      toCreate.push({
        title: def.title,
        handle: def.handle,
        metadata: def.metadata,
      });
      logger.info(`ensure-collections: will create collection "${def.handle}"`);
    } else {
      const prev = (existing.metadata ?? {}) as Record<string, unknown>;
      const merged: Record<string, string> = { ...def.metadata };
      for (const [k, v] of Object.entries(prev)) {
        if (!(k in merged) && typeof v === "string") merged[k] = v;
      }
      await updateCollectionsWorkflow(container).run({
        input: {
          selector: { id: existing.id },
          update: {
            title: def.title,
            metadata: merged,
          },
        },
      });
      logger.info(
        `ensure-collections: updated metadata/title for existing collection "${def.handle}"`,
      );
    }
  }

  if (toCreate.length) {
    const { result: created } = await createCollectionsWorkflow(container).run({
      input: { collections: toCreate },
    });
    for (const c of created) {
      if (c.handle) {
        byHandle.set(c.handle, {
          id: c.id,
          handle: c.handle,
          title: c.title,
          metadata: c.metadata as Record<string, unknown> | null,
        });
      }
    }
    logger.info(`ensure-collections: created ${created.length} collection(s)`);
  }

  for (const def of JEWELLERY_COLLECTIONS) {
    const col = byHandle.get(def.handle);
    if (!col) {
      logger.warn(`ensure-collections: missing collection id for "${def.handle}" — skip links`);
      continue;
    }
    const add = def.productHandles
      .map((h) => productIdByHandle.get(h))
      .filter((id): id is string => Boolean(id));
    const missing = def.productHandles.filter((h) => !productIdByHandle.has(h));
    if (missing.length) {
      logger.warn(
        `ensure-collections: [${def.handle}] no product with handle(s): ${missing.join(", ")}`,
      );
    }
    if (!add.length) {
      logger.warn(`ensure-collections: [${def.handle}] no products to link — skip`);
      continue;
    }
    await batchLinkProductsToCollectionWorkflow(container).run({
      input: {
        id: col.id,
        add,
      },
    });
    logger.info(
      `ensure-collections: linked ${add.length} product(s) to "${def.handle}"`,
    );
  }

  logger.info("ensure-collections: done.");
}
