import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ensureVariantComplianceCodes } from "../lib/compliance-codes";

export default async function variantComplianceCodesHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await ensureVariantComplianceCodes(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product-variant.updated"],
};
