import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ensureProductHandleUnique } from "../lib/product-handle";

export default async function productUniqueHandleHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await ensureProductHandleUnique(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
