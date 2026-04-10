import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { updateStoresStep } from "@medusajs/medusa/core-flows";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies-inr-only",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map((currency) => ({
            currency_code: currency.currency_code,
            is_default: currency.is_default ?? false,
          })),
        },
      };
    });
    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  },
);

type RegionRow = { id: string; currency_code?: string | null; name?: string | null };

/**
 * Soft-deletes regions whose currency is not INR, and pins the store to INR-only.
 * Run after demos or imports that left EUR/USD/Europe regions (extra variant price columns).
 *
 * Usage: `npm run ensure:inr` from /backend
 */
export default async function ensureInrOnly({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModule = container.resolve(Modules.REGION) as {
    softDeleteRegions: (ids: string[]) => Promise<unknown>;
  };

  const [store] = await storeModuleService.listStores();
  if (!store?.id) {
    logger.warn("ensure-inr-only: no store found.");
    return;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: "inr", is_default: true }],
    },
  });

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "name"],
  });

  const list = (regions ?? []) as RegionRow[];
  const inrRegions = list.filter(
    (r) => (r.currency_code ?? "").toLowerCase() === "inr",
  );
  const nonInr = list.filter(
    (r) => (r.currency_code ?? "").toLowerCase() !== "inr",
  );

  if (!inrRegions.length && nonInr.length) {
    logger.warn(
      "ensure-inr-only: no INR region found; not deleting regions. Create an India/INR region first (see seed).",
    );
    return;
  }

  if (!nonInr.length) {
    logger.info("ensure-inr-only: only INR regions (or none). Store currencies set to INR.");
    return;
  }

  await regionModule.softDeleteRegions(nonInr.map((r) => r.id));
  logger.info(
    `ensure-inr-only: soft-deleted ${nonInr.length} non-INR region(s): ${nonInr
      .map((r) => `${r.name ?? r.id} (${r.currency_code})`)
      .join(", ")}`,
  );
  logger.info("ensure-inr-only: refresh Medusa Admin — variant pricing should show INR only.");
}
