import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ensureProductComplianceCodes } from "../lib/compliance-codes";

export default async function productComplianceCodesHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await ensureProductComplianceCodes(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
