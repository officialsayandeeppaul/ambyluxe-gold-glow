import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils";
import type { ICustomerModuleService, IOrderModuleService, OrderDTO } from "@medusajs/types";
import {
  brevoIntegrationEnabled,
  brevoSendTransactionalEmailWithTemplateFallback,
  brevoSendWhatsappTemplate,
  phoneToBrevoWhatsappRecipient,
} from "../lib/brevo/client";
import { brevoOrderLineImageTemplateParams } from "../lib/brevo/order-line-images";
import { orderGrandTotalMinor } from "../lib/brevo/order-money";
import { buildOrderInvoiceEmailHtml } from "../lib/brevo/order-summary-html";
import { medusaAmountToMajor } from "../lib/shiprocket/money";
import { createNotification } from "../lib/notifications-store";

type BrevoOrderMeta = {
  status?: "sent" | "error" | "skipped";
  channel?: "email" | "whatsapp" | "skipped";
  sent_at?: string;
  last_error?: string;
};

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v) || 0;
  return 0;
}

function isValidEmail(e: string | null | undefined): boolean {
  if (!e?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function orderEmail(order: OrderDTO, customerEmail: string | null): string | null {
  const direct = (order as { email?: string | null }).email;
  if (isValidEmail(direct ?? undefined)) return direct!.trim();
  if (isValidEmail(customerEmail ?? undefined)) return customerEmail!.trim();
  return null;
}

function orderPhone(order: OrderDTO, customerPhone: string | null): string | null {
  const ship = order.shipping_address?.phone?.trim();
  if (ship) return ship;
  const bill = order.billing_address?.phone?.trim();
  if (bill) return bill;
  if (customerPhone?.trim()) return customerPhone.trim();
  return null;
}

function parseTemplateId(raw: string | undefined): number | undefined {
  const n = Number(raw?.trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function brevoOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderId = data?.id;

  if (!brevoIntegrationEnabled()) {
    logger.info(
      "Brevo: order notification disabled (set BREVO_ENABLED=true and BREVO_API_KEY in backend/.env).",
    );
    return;
  }

  if (!orderId) {
    logger.warn("Brevo: order.placed missing id; skip.");
    return;
  }

  logger.info(`Brevo: order.placed handler starting for ${orderId}`);

  const orderModule = container.resolve(Modules.ORDER) as IOrderModuleService;

  let order: OrderDTO;
  try {
    order = (await orderModule.retrieveOrder(orderId, {
      relations: [
        "items",
        "items.detail",
        "items.variant",
        "items.product",
        "shipping_address",
        "billing_address",
      ],
    })) as OrderDTO;
  } catch (e1) {
    try {
      order = (await orderModule.retrieveOrder(orderId, {
        relations: ["items", "items.detail", "shipping_address", "billing_address"],
      })) as OrderDTO;
    } catch (e) {
      logger.error(
        `Brevo: could not load order ${orderId}: ${e instanceof Error ? e.message : e}`,
      );
      return;
    }
    logger.warn(
      `Brevo: order ${orderId} loaded without items.variant/product (thumbnail params may be empty): ${e1 instanceof Error ? e1.message : e1}`,
    );
  }

  const meta = { ...(order.metadata || {}) } as Record<string, unknown>;
  const prev = meta.brevo_order_notify as BrevoOrderMeta | undefined;
  if (prev?.status === "sent") {
    logger.info(`Brevo: order ${orderId} already notified (${prev.channel}); skip.`);
    return;
  }

  await createNotification({
    type: "order_placed",
    customer_id: order.customer_id ?? undefined,
    email: (order as { email?: string | null }).email ?? undefined,
    title: `Order #${order.display_id ?? ""} placed`,
    body: "Your order is confirmed. We will notify you as it moves through fulfillment.",
    metadata: {
      order_id: order.id,
      display_id: order.display_id ?? null,
      status: order.status ?? null,
    },
  });

  let customerEmail: string | null = null;
  let customerPhone: string | null = null;
  if (order.customer_id) {
    try {
      const customerModule = container.resolve(Modules.CUSTOMER) as ICustomerModuleService;
      const c = await customerModule.retrieveCustomer(order.customer_id);
      customerEmail = c?.email?.trim() || null;
      customerPhone = c?.phone?.trim() || null;
    } catch {
      /* optional */
    }
  }

  const email = orderEmail(order, customerEmail);
  const phone = orderPhone(order, customerPhone);

  logger.info(
    `Brevo: order ${orderId} display_id=${order.display_id ?? "?"} recipient email=${email ? "[set]" : "[none]"} phone=${phone ? "[set]" : "[none]"}`,
  );

  const tplOrderEmail = parseTemplateId(process.env.BREVO_ORDER_EMAIL_TEMPLATE_ID);
  const tplWhatsapp = parseTemplateId(process.env.BREVO_ORDER_WHATSAPP_TEMPLATE_ID);

  const mark = async (patch: BrevoOrderMeta) => {
    meta.brevo_order_notify = {
      ...prev,
      ...patch,
      sent_at: patch.sent_at ?? new Date().toISOString(),
    };
    try {
      await orderModule.updateOrders(orderId, { metadata: meta });
    } catch (e) {
      logger.warn(
        `Brevo: could not persist metadata on ${orderId}: ${e instanceof Error ? e.message : e}`,
      );
    }
  };

  if (email) {
    const { subject, html, text } = buildOrderInvoiceEmailHtml(order);
    const first = [order.shipping_address?.first_name, order.shipping_address?.last_name]
      .filter(Boolean)
      .join(" ");
    const totalMajor = medusaAmountToMajor(
      orderGrandTotalMinor(order),
      order.currency_code || "inr",
    );
    const currencyU = (order.currency_code || "inr").toUpperCase();
    const storeUrl = (process.env.STORE_PUBLIC_URL || "").replace(/\/$/, "") || "";
    /** Use in Brevo preview text as {{ params.EMAIL_PREHEADER }} (Brevo suggests ≤35 chars; longer strings truncate in some clients). */
    const emailPreheader = `${first || "Customer"}, thanks — order #${order.display_id ?? ""} · ${totalMajor.toFixed(0)} ${currencyU}`
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    const firstName =
      (order.shipping_address?.first_name ?? "").trim() ||
      (first ? first.split(/\s+/)[0] : "") ||
      "Customer";
    const orderBodyIntroLine1 =
      `Dear ${firstName}, thank you for your purchase.`.replace(/\s+/g, " ").trim();
    const orderBodyIntroLine2 =
      `Order #${order.display_id ?? ""} is confirmed — we're preparing your items and will share updates when they ship.`
        .replace(/\s+/g, " ")
        .trim();
    /** Full paragraph if Brevo uses a single text block; split lines for two blocks beside the hero image. */
    const orderBodyIntro = `${orderBodyIntroLine1} ${orderBodyIntroLine2}`.trim();
    const r = await brevoSendTransactionalEmailWithTemplateFallback({
      toEmail: email,
      toName: first || undefined,
      subject: tplOrderEmail ? `Order #${order.display_id ?? ""}` : subject,
      htmlContent: html,
      textContent: text,
      ...(tplOrderEmail
        ? {
            templateId: tplOrderEmail,
            templateParams: {
              ORDER_DISPLAY_ID: String(order.display_id ?? ""),
              CUSTOMER_NAME: first || "Customer",
              CUSTOMER_FIRST_NAME: firstName,
              ORDER_BODY_INTRO: orderBodyIntro,
              ORDER_BODY_INTRO_LINE1: orderBodyIntroLine1,
              ORDER_BODY_INTRO_LINE2: orderBodyIntroLine2,
              ORDER_TOTAL: String(totalMajor),
              CURRENCY: currencyU,
              STORE_URL: storeUrl,
              EMAIL_PREHEADER: emailPreheader,
              ...brevoOrderLineImageTemplateParams(order),
            },
          }
        : {}),
    });

    if (r.ok) {
      logger.info(
        `Brevo: order ${orderId} receipt emailed to ${email}${r.usedHtmlFallback ? " (HTML fallback — check BREVO_ORDER_EMAIL_TEMPLATE_ID is an SMTP/transactional template)" : ""}`,
      );
      await mark({ status: "sent", channel: "email" });
      return;
    }
    logger.warn(`Brevo: email failed for ${orderId}: ${r.message}`);
    await mark({ status: "error", channel: "email", last_error: r.message });
  }

  if (!tplWhatsapp) {
    logger.info(
      `Brevo: no email sent for ${orderId} and BREVO_ORDER_WHATSAPP_TEMPLATE_ID unset — WhatsApp fallback skipped.`,
    );
    await mark({
      status: email ? "error" : "skipped",
      channel: email ? "email" : "skipped",
      last_error: email ? "email_failed_no_whatsapp_template" : "no_email_no_whatsapp_template",
    });
    return;
  }

  const waDigits = phoneToBrevoWhatsappRecipient(phone);
  if (!waDigits) {
    logger.warn(`Brevo: order ${orderId} has no usable phone for WhatsApp fallback.`);
    await mark({
      status: "skipped",
      channel: "skipped",
      last_error: "no_phone",
    });
    return;
  }

  const currency = (order.currency_code || "inr").toUpperCase();
  const totalMajor = medusaAmountToMajor(orderGrandTotalMinor(order), currency);
  const w = await brevoSendWhatsappTemplate({
    recipientDigits: waDigits,
    templateId: tplWhatsapp,
    templateParams: {
      ORDER_DISPLAY_ID: String(order.display_id ?? ""),
      ORDER_TOTAL: totalMajor.toFixed(2),
      CURRENCY: currency,
    },
  });

  if (w.ok) {
    logger.info(`Brevo: order ${orderId} WhatsApp sent to ${waDigits}`);
    await mark({ status: "sent", channel: "whatsapp" });
    return;
  }

  logger.error(`Brevo: WhatsApp failed for ${orderId}: ${w.message}`);
  await mark({ status: "error", channel: "whatsapp", last_error: w.message });
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
};
