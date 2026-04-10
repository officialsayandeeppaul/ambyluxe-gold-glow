import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils";
import type { IOrderModuleService, OrderDTO } from "@medusajs/types";
import {
  getShiprocketAuthLockoutUntilMs,
  isShiprocketAccountLockoutMessage,
  shiprocketCreateAdhocOrder,
} from "../lib/shiprocket/client";
import { buildShiprocketAdhocPayload } from "../lib/shiprocket/map-medusa-order";
import { createNotification } from "../lib/notifications-store";

type ShiprocketMeta = {
  status?: "success" | "error";
  pushed_at?: string;
  channel_order_id?: string;
  sr_order_id?: number | string;
  shipment_id?: number | string;
  medusa_fulfillment_id?: string;
  last_error?: string;
  response_preview?: string;
  /** When Shiprocket blocked logins; backend skips further login calls until this instant (ISO). */
  auth_lockout_until?: string;
};

/** `order.fulfillment_created` uses `{ order_id, fulfillment_id, ... }` (admin “Fulfill items”). */
type ShiprocketTriggerPayload = {
  id?: string;
  order_id?: string;
  fulfillment_id?: string;
  no_notification?: boolean;
};

function orderIdFromPayload(data: ShiprocketTriggerPayload | undefined): string | undefined {
  if (data == null) return undefined;
  if (typeof data.order_id === "string" && data.order_id.length > 0) return data.order_id;
  if (typeof data.id === "string" && data.id.length > 0) return data.id;
  return undefined;
}

/** Accepts true / 1 / yes / on (case-insensitive); strips common .env quotes. */
function shiprocketEnabled(): boolean {
  let v = process.env.SHIPROCKET_ENABLED?.trim().toLowerCase() ?? "";
  v = v.replace(/^["']|["']$/g, "");
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export default async function shiprocketFulfillmentCreatedHandler({
  event: { name, data },
  container,
}: SubscriberArgs<ShiprocketTriggerPayload>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderId = orderIdFromPayload(data);

  logger.info(
    `Shiprocket: ${name} received (order_id=${orderId ?? "?"}${data?.fulfillment_id ? `, fulfillment_id=${data.fulfillment_id}` : ""}); integration ${shiprocketEnabled() ? "enabled" : "DISABLED — set SHIPROCKET_ENABLED=true in backend/.env and restart Medusa"}.`,
  );

  if (!shiprocketEnabled()) {
    return;
  }

  if (!orderId) {
    logger.error(
      "Shiprocket: fulfillment_created payload missing order_id/id; abort.",
    );
    return;
  }

  const pickup =
    process.env.SHIPROCKET_PICKUP_LOCATION?.trim().replace(/^["']|["']$/g, "") ||
    process.env.SHIPROCKET_PICKUP?.trim().replace(/^["']|["']$/g, "") ||
    "";
  if (!pickup) {
    logger.warn(
      "Shiprocket: set SHIPROCKET_PICKUP_LOCATION (or SHIPROCKET_PICKUP) in backend/.env to your warehouse name exactly as in Shiprocket → Settings → Pickup location. Skipping sync.",
    );
    return;
  }

  const orderModule = container.resolve(Modules.ORDER) as IOrderModuleService;

  logger.info(`Shiprocket: loading order ${orderId} and calling Shiprocket API…`);

  let order: OrderDTO;
  try {
    order = (await orderModule.retrieveOrder(orderId, {
      relations: [
        "items",
        "shipping_address",
        "billing_address",
        "transactions",
        "shipping_methods",
      ],
    })) as OrderDTO;
  } catch (e) {
    logger.error(
      `Shiprocket: could not load order ${orderId}: ${e instanceof Error ? e.message : e}`,
    );
    return;
  }

  const meta = { ...(order.metadata || {}) } as Record<string, unknown>;
  const prev = meta.shiprocket as ShiprocketMeta | undefined;
  await createNotification({
    type: "order_fulfillment_created",
    customer_id: order.customer_id ?? undefined,
    email: order.email ?? undefined,
    title: `Order #${order.display_id ?? ""} update`,
    body: "Your order moved to fulfillment. Shipping information will be shared as soon as available.",
    metadata: {
      order_id: order.id,
      display_id: order.display_id ?? null,
      fulfillment_id: data?.fulfillment_id ?? null,
      status: order.status ?? null,
    },
  });

  if (prev?.status === "success" && prev.sr_order_id != null) {
    logger.info(
      `Shiprocket: order ${orderId} already synced (sr_order_id=${prev.sr_order_id}), skip.`,
    );
    return;
  }

  try {
    const payload = buildShiprocketAdhocPayload(order, pickup);
    const response = await shiprocketCreateAdhocOrder(payload);

    const srOrderId = response.order_id as number | string | undefined;
    const shipmentId = response.shipment_id as number | string | undefined;

    meta.shiprocket = {
      status: "success",
      pushed_at: new Date().toISOString(),
      channel_order_id: String(payload.order_id),
      sr_order_id: srOrderId,
      shipment_id: shipmentId,
      ...(data?.fulfillment_id
        ? { medusa_fulfillment_id: data.fulfillment_id }
        : {}),
      response_preview: JSON.stringify(response).slice(0, 2000),
    };

    await orderModule.updateOrders(orderId, { metadata: meta });
    logger.info(
      `Shiprocket: Medusa order ${orderId} pushed (channel_order_id=${payload.order_id}, sr_order_id=${srOrderId}).`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lockUntilMs = getShiprocketAuthLockoutUntilMs();
    const lockIso =
      lockUntilMs > Date.now()
        ? new Date(lockUntilMs).toISOString()
        : undefined;
    if (isShiprocketAccountLockoutMessage(msg) || msg.includes("local backoff until")) {
      logger.warn(
        `Shiprocket: ${orderId} — ${msg.slice(0, 500)} Further orders will skip Shiprocket login until backoff ends (see SHIPROCKET_LOCKOUT_BACKOFF_MS).`,
      );
    } else {
      logger.error(`Shiprocket: sync failed for ${orderId}: ${msg}`);
    }

    meta.shiprocket = {
      ...prev,
      status: "error",
      pushed_at: new Date().toISOString(),
      last_error: msg.slice(0, 2000),
      ...(lockIso ? { auth_lockout_until: lockIso } : {}),
    };

    try {
      await orderModule.updateOrders(orderId, { metadata: meta });
    } catch (metaErr) {
      logger.error(
        `Shiprocket: failed to persist error on order metadata: ${metaErr instanceof Error ? metaErr.message : metaErr}`,
      );
    }
  }
}

export const config: SubscriberConfig = {
  /** Shiprocket adhoc order only after admin creates a fulfillment (e.g. “Fulfill items”), not on checkout. */
  event: OrderWorkflowEvents.FULFILLMENT_CREATED,
};
