import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ensureVariantSku } from "../lib/auto-variant-sku";

export default async function variantAutoSkuHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await ensureVariantSku(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product-variant.updated"],
};
