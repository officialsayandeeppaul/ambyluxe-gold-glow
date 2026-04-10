import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { syncOneVariantPhysicalFromProduct } from "../lib/sync-variant-physical-from-product";

export default async function variantSyncPhysicalHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncOneVariantPhysicalFromProduct(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product-variant.created"],
};
