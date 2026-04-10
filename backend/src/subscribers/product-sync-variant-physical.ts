import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { syncAllVariantsPhysicalFromProduct } from "../lib/sync-variant-physical-from-product";

export default async function productSyncVariantPhysicalHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncAllVariantsPhysicalFromProduct(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
