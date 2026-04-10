import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateInventoryItemsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

/** Set `MEDUSA_DISABLE_SYNC_VARIANT_PHYSICAL=true` to turn off subscribers + backfill. */
export function syncVariantPhysicalEnabled(): boolean {
  return process.env.MEDUSA_DISABLE_SYNC_VARIANT_PHYSICAL !== "true";
}

type PhysRow = {
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  origin_country?: string | null;
  material?: string | null;
};

/** Fields to copy from product → variant / inventory item when target values are empty. */
function physicalPatchFromProduct(
  product: PhysRow,
  target: PhysRow,
): Record<string, unknown> | null {
  const update: Record<string, unknown> = {};
  const nums: (keyof PhysRow)[] = ["weight", "width", "length", "height"];
  for (const key of nums) {
    const pv = product[key];
    const vv = target[key];
    if (typeof pv !== "number" || Number.isNaN(pv)) continue;
    if (typeof vv === "number" && !Number.isNaN(vv)) continue;
    update[key] = pv;
  }

  const pvCo =
    typeof product.origin_country === "string" ? product.origin_country.trim() : "";
  const vvCo =
    typeof target.origin_country === "string" ? target.origin_country.trim() : "";
  if (pvCo && !vvCo) update.origin_country = product.origin_country;

  const pvM = typeof product.material === "string" ? product.material.trim() : "";
  const vvM = typeof target.material === "string" ? target.material.trim() : "";
  if (pvM && !vvM) update.material = product.material;

  return Object.keys(update).length ? update : null;
}

type InvItemRow = PhysRow & { id: string };

/** Medusa Admin variant “Attributes” often reads linked inventory items — merge product → those rows. */
function collectInventoryItemsFromVariantRow(row: unknown): InvItemRow[] {
  const out: InvItemRow[] = [];
  if (!row || typeof row !== "object") return out;
  const r = row as Record<string, unknown>;

  const pushInv = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    if (typeof o.id === "string" && o.id) {
      out.push(o as InvItemRow);
    }
  };

  if (Array.isArray(r.inventory)) {
    for (const x of r.inventory) pushInv(x);
  }
  if (Array.isArray(r.inventory_items)) {
    for (const link of r.inventory_items) {
      if (!link || typeof link !== "object") continue;
      const l = link as Record<string, unknown>;
      pushInv(l.inventory);
    }
  }
  return out;
}

async function syncLinkedInventoryPhysicalFromProduct(
  container: ExecArgs["container"],
  variantId: string,
  productPhys: PhysRow,
  logger: { info: (msg: string) => void },
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "inventory.id",
      "inventory.weight",
      "inventory.length",
      "inventory.width",
      "inventory.height",
      "inventory.origin_country",
      "inventory.material",
      "inventory_items.inventory.id",
      "inventory_items.inventory.weight",
      "inventory_items.inventory.length",
      "inventory_items.inventory.width",
      "inventory_items.inventory.height",
      "inventory_items.inventory.origin_country",
      "inventory_items.inventory.material",
    ],
    filters: { id: variantId },
  });

  const items = collectInventoryItemsFromVariantRow(data?.[0]);
  const seen = new Set<string>();
  const updates: Record<string, unknown>[] = [];

  for (const inv of items) {
    if (!inv.id || seen.has(inv.id)) continue;
    seen.add(inv.id);
    const patch = physicalPatchFromProduct(productPhys, inv);
    if (!patch) continue;
    updates.push({ id: inv.id, ...patch });
  }

  if (!updates.length) return;

  await updateInventoryItemsWorkflow(container).run({
    input: { updates },
  });
  logger.info(
    `[sync-variant-physical] Inventory item(s) for variant ${variantId} ← product physical (${updates.length} row(s))`,
  );
}

type ProductGraphRow = PhysRow & {
  id: string;
  variants?: Array<PhysRow & { id: string }>;
};

/** After product save: fill empty variant physical fields from the product (Admin shows same values). */
export async function syncAllVariantsPhysicalFromProduct(
  container: ExecArgs["container"],
  productId: string,
): Promise<void> {
  if (!syncVariantPhysicalEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "weight",
      "width",
      "length",
      "height",
      "origin_country",
      "material",
      "variants.id",
      "variants.weight",
      "variants.width",
      "variants.length",
      "variants.height",
      "variants.origin_country",
      "variants.material",
    ],
    filters: { id: productId },
  });

  const row = data?.[0] as ProductGraphRow | undefined;
  if (!row?.variants?.length) return;

  const productPhys: PhysRow = {
    weight: row.weight,
    width: row.width,
    length: row.length,
    height: row.height,
    origin_country: row.origin_country,
    material: row.material,
  };

  for (const v of row.variants) {
    if (!v?.id) continue;
    const patch = physicalPatchFromProduct(productPhys, v);
    if (patch) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: [{ id: v.id, ...patch }],
        },
      });
      logger.info(`[sync-variant-physical] Variant ${v.id} ← product ${productId} physical fields`);
    }
    await syncLinkedInventoryPhysicalFromProduct(container, v.id, productPhys, logger);
  }
}

/** New variant: copy product physical attributes when variant fields are empty. */
export async function syncOneVariantPhysicalFromProduct(
  container: ExecArgs["container"],
  variantId: string,
): Promise<void> {
  if (!syncVariantPhysicalEnabled()) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: vRows } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product_id",
      "weight",
      "width",
      "length",
      "height",
      "origin_country",
      "material",
    ],
    filters: { id: variantId },
  });

  const variant = vRows?.[0] as (PhysRow & { id: string; product_id?: string | null }) | undefined;
  const productId = variant?.product_id;
  if (!variant || !productId) return;

  const { data: pRows } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "weight",
      "width",
      "length",
      "height",
      "origin_country",
      "material",
    ],
    filters: { id: productId },
  });

  const product = pRows?.[0] as (PhysRow & { id: string }) | undefined;
  if (!product) return;

  const patch = physicalPatchFromProduct(product, variant);
  if (patch) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [{ id: variantId, ...patch }],
      },
    });
    logger.info(`[sync-variant-physical] Variant ${variantId} ← product ${productId} physical fields`);
  }
  await syncLinkedInventoryPhysicalFromProduct(container, variantId, product, logger);
}
