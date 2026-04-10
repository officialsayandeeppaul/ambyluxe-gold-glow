import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils";
import {
  createPromotionsWorkflow,
  deletePromotionsWorkflow,
} from "@medusajs/medusa/core-flows";
import { inrPaiseFromRupeesMajor } from "../lib/seed-catalog-inr-prices";

/**
 * Seeds seven demo promotions (same shapes as Admin “Create promotion” types).
 * Safe to run on an existing DB: removes prior rows with the same codes, then recreates them.
 *
 *   npx medusa exec ./src/scripts/seed-promotions.ts
 *
 * Buy-get (AMB_DEMO_BUY2GET1) — Admin pitfall:
 * Do NOT add a separate buy rule like “Minimum quantity of items = 2” in the Buy rules editor.
 * Minimum buy count is already `buy_rules_min_quantity` on the application method; duplicating it
 * as another rule often breaks evaluation (empty `promotions` on the cart after apply).
 * Buy rules here should only scope the product (e.g. product id). Target rules: product scope only;
 * “Quantity the promotion applies to” is `apply_to_quantity` on the method — do not duplicate it as a
 * separate target rule row in Admin.
 *
 * Codes (enter at Store API checkout / Admin tests):
 * - AMB_DEMO_ITEM_FIXED   — fixed amount off specific product (Celestial Pearl Drops)
 * - AMB_DEMO_ORDER_FIXED  — fixed amount off whole order
 * - AMB_DEMO_ITEM_PCT     — % off one product (Eternal Diamond Solitaire)
 * - AMB_DEMO_ORDER_PCT    — % off order
 * - AMB_DEMO_BUY2GET1       — Buy-get on Infinity Tennis Bracelet (Medusa often needs 3 in cart for same-SKU B2G1)
 * - AMB_DEMO_BRACELET_PAIR50 — 50% off each Infinity Tennis Bracelet unit (2 in cart ≈ pay for 1; reliable storefront demo)
 * - AMB_DEMO_FREESHIP       — automatic 100% shipping off when subtotal ≥ ₹1 (100 paise)
 */
const DEMO_CODES = [
  "AMB_DEMO_ITEM_FIXED",
  "AMB_DEMO_ORDER_FIXED",
  "AMB_DEMO_ITEM_PCT",
  "AMB_DEMO_ORDER_PCT",
  "AMB_DEMO_BUY2GET1",
  "AMB_DEMO_BRACELET_PAIR50",
  "AMB_DEMO_FREESHIP",
] as const;

export default async function seedPromotionsOnly({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  async function productIdOrThrow(handle: string): Promise<string> {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle },
    });
    const row = data?.[0] as { id?: string } | undefined;
    if (!row?.id) {
      throw new Error(
        `seed-promotions: product with handle "${handle}" not found. Run full seed first.`,
      );
    }
    return row.id;
  }

  const pidCelestial = await productIdOrThrow("celestial-pearl-drops");
  const pidEternal = await productIdOrThrow("eternal-diamond-solitaire");
  const pidBracelet = await productIdOrThrow("infinity-tennis-bracelet");

  const idsToDelete: string[] = [];
  for (const code of DEMO_CODES) {
    const { data: rows } = await query.graph({
      entity: "promotion",
      fields: ["id"],
      filters: { code: code as string },
    });
    for (const row of rows ?? []) {
      if (row && typeof row === "object" && "id" in row && row.id) {
        idsToDelete.push(String(row.id));
      }
    }
  }

  if (idsToDelete.length) {
    await deletePromotionsWorkflow(container).run({ input: { ids: idsToDelete } });
    logger.info(`Removed ${idsToDelete.length} existing AMB_DEMO_* promotion(s).`);
  }

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: "AMB_DEMO_ITEM_FIXED",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "fixed",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: inrPaiseFromRupeesMajor(2500),
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidCelestial],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_ORDER_FIXED",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "fixed",
            target_type: "order",
            value: inrPaiseFromRupeesMajor(10000),
            currency_code: "inr",
          },
        },
        {
          code: "AMB_DEMO_ITEM_PCT",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 12,
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidEternal],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_ORDER_PCT",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            value: 5,
            currency_code: "inr",
          },
        },
        {
          code: "AMB_DEMO_BUY2GET1",
          type: "buyget",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 100,
            currency_code: "inr",
            buy_rules_min_quantity: 2,
            apply_to_quantity: 1,
            buy_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_BRACELET_PAIR50",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "items",
            allocation: "each",
            max_quantity: 999,
            value: 50,
            currency_code: "inr",
            target_rules: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [pidBracelet],
              },
            ],
          },
        },
        {
          code: "AMB_DEMO_FREESHIP",
          type: "standard",
          status: "active",
          is_automatic: true,
          application_method: {
            type: "percentage",
            target_type: "shipping_methods",
            allocation: "across",
            value: 100,
            currency_code: "inr",
          },
          rules: [
            {
              attribute: "subtotal",
              operator: "gte",
              values: ["100"],
            },
          ],
        },
      ],
    },
  });

  logger.info(
    `Promotions seeded: ${DEMO_CODES.join(", ")}. ` +
      `Apply codes in checkout (Store API). AMB_DEMO_FREESHIP is automatic when subtotal ≥ ₹1. ` +
      `For two Infinity Tennis Bracelets (pay for one), use AMB_DEMO_BRACELET_PAIR50.`,
  );
}
