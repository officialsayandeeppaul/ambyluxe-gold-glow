import { createPaymentSessionsWorkflow } from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import { refetchPaymentCollection } from "@medusajs/medusa/api/store/payment-collections/helpers";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";

/**
 * Fields loaded for the cart passed to @sgftech/payment-razorpay as `context.extra`
 * (Medusa core Store route does not forward client `context`; the provider expects the cart here).
 */
const RAZORPAY_CART_REMOTE_QUERY_FIELDS = [
  "id",
  "currency_code",
  "email",
  "region_id",
  "customer_id",
  "sales_channel_id",
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "shipping_total",
  "item_total",
  "metadata",
  "created_at",
  "updated_at",
  "completed_at",
  "locale",
  "items.*",
  "shipping_methods.*",
  "shipping_address.*",
  "billing_address.*",
  "customer.*",
  "customer.addresses.*",
  "region.*",
  "region.countries.*",
  "payment_collection.id",
  "payment_collection.currency_code",
  "payment_collection.amount",
  "payment_collection.status",
] as string[];

/** Include `data` JSON (Razorpay order id / amount) — `*payment_sessions` alone can omit it in some queries. */
const DEFAULT_PAYMENT_COLLECTION_FIELDS = [
  "id",
  "currency_code",
  "amount",
  "status",
  "*payment_sessions",
  "payment_sessions.data",
  "payment_sessions.*",
] as string[];

type InitBody = {
  provider_id?: string;
  data?: Record<string, unknown>;
};

/**
 * POST /store/payment-collections/:id/payment-sessions
 *
 * Same contract as Medusa core, but injects `context.extra = cart` for Razorpay
 * (sgftech provider reads the cart from `input.context.extra` during initiatePayment).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId =
    ((req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? "") || undefined;

  const collectionId = req.params.id as string;
  const { provider_id, data } = (req.body ?? {}) as InitBody;

  if (!provider_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "provider_id is required",
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: linkRows } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["cart_id", "payment_collection_id"],
    filters: { payment_collection_id: collectionId },
  });

  let cartId = (linkRows?.[0] as { cart_id?: string } | undefined)?.cart_id;

  if (!cartId) {
    const { data: pcRows } = await query.graph({
      entity: "payment_collection",
      fields: ["id", "cart_link.cart_id"],
      filters: { id: collectionId },
    });
    const pc = pcRows?.[0] as { cart_link?: { cart_id?: string } } | undefined;
    cartId = pc?.cart_link?.cart_id;
  }

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No cart linked to this payment collection",
    );
  }

  const cart = await refetchCart(cartId, req.scope, RAZORPAY_CART_REMOTE_QUERY_FIELDS);

  const fieldList =
    req.queryConfig?.fields?.length && req.queryConfig.fields.length > 0
      ? req.queryConfig.fields
      : DEFAULT_PAYMENT_COLLECTION_FIELDS;

  const { result: createdSession } = await createPaymentSessionsWorkflow(
    req.scope,
  ).run({
    input: {
      payment_collection_id: collectionId,
      provider_id,
      customer_id: actorId,
      data: data ?? {},
      context: {
        extra: cart,
      },
    } as never,
  });

  const paymentCollection = await refetchPaymentCollection(
    collectionId,
    req.scope,
    fieldList,
  );

  /**
   * Store graph/refetch often returns `payment_sessions[].data` as `{}` even though
   * `PaymentModuleService.createPaymentSession` persists Razorpay order payload.
   * Merge the workflow step output (serialized session with full `data`) by id.
   */
  type SessionWithData = {
    id?: string;
    data?: Record<string, unknown> | null;
  };
  const created = createdSession as SessionWithData | undefined;
  const sessionId = created?.id;

  const mergeDataIntoSession = (data: Record<string, unknown> | null | undefined) => {
    if (
      !sessionId ||
      !data ||
      typeof data !== "object" ||
      Object.keys(data).length === 0 ||
      !paymentCollection?.payment_sessions?.length
    ) {
      return;
    }
    paymentCollection.payment_sessions = paymentCollection.payment_sessions.map(
      (s) => (s.id === sessionId ? { ...s, data } : s),
    );
  };

  mergeDataIntoSession(created?.data ?? null);

  if (sessionId && paymentCollection?.payment_sessions?.length) {
    const sess = paymentCollection.payment_sessions.find((s) => s.id === sessionId);
    const d = sess?.data as Record<string, unknown> | undefined;
    if (!d || typeof d !== "object" || Object.keys(d).length === 0) {
      try {
        const { data: rawRows } = await query.graph({
          entity: "payment_session",
          fields: ["id", "data"],
          filters: { id: sessionId },
        });
        const raw = rawRows?.[0] as
          | { id?: string; data?: Record<string, unknown> | null }
          | undefined;
        mergeDataIntoSession(raw?.data ?? null);
      } catch {
        // ignore — empty data means provider failed; client will surface checkout error
      }
    }
  }

  if (sessionId && paymentCollection?.payment_sessions?.length) {
    const sess = paymentCollection.payment_sessions.find((s) => s.id === sessionId);
    const d = sess?.data as Record<string, unknown> | undefined;
    if (!d || typeof d !== "object" || Object.keys(d).length === 0) {
      const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
        warn: (msg: string) => void;
      };
      logger.warn(
        `[Razorpay] Payment session ${sessionId} has empty data after initiate. ` +
          `Razorpay Orders API likely did not return an order. In test mode, amounts above ~₹50,000 are often rejected. ` +
          `Check backend/.env RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, restart Medusa, and look for "[Razorpay] orders.create failed" in logs.`,
      );
    }
  }

  res.status(200).json({ payment_collection: paymentCollection });
}
