import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  CustomerWorkflowEvents,
  Modules,
} from "@medusajs/framework/utils";
import type { ICustomerModuleService } from "@medusajs/types";
import {
  brevoIntegrationEnabled,
  brevoSendTransactionalEmail,
  brevoSendWhatsappTemplate,
  phoneToBrevoWhatsappRecipient,
} from "../lib/brevo/client";
import { createNotification } from "../lib/notifications-store";

function stripQuotes(v: string): string {
  return v.replace(/^["']|["']$/g, "").trim();
}

function truthyEnv(name: string): boolean {
  const v = stripQuotes(process.env[name]?.toLowerCase() ?? "");
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function parseTemplateId(raw: string | undefined): number | undefined {
  const n = Number(raw?.trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isValidEmail(e: string | null | undefined): boolean {
  if (!e?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

type BrevoWelcomeMeta = {
  sent_at?: string;
  channel?: "whatsapp" | "email";
  last_error?: string;
};

/**
 * Optional first-touch message after account creation (phone OTP or email signup).
 * Configure WhatsApp template in Brevo with approved marketing/compliance copy.
 */
export default async function brevoCustomerWelcomeHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const customerId = data?.id;

  if (!brevoIntegrationEnabled() || !truthyEnv("BREVO_CUSTOMER_WELCOME_ENABLED")) {
    return;
  }
  if (!customerId) return;

  const waTpl = parseTemplateId(process.env.BREVO_CUSTOMER_WELCOME_WHATSAPP_TEMPLATE_ID);
  const emailTpl = parseTemplateId(process.env.BREVO_CUSTOMER_WELCOME_EMAIL_TEMPLATE_ID);

  if (!waTpl && !emailTpl) {
    logger.info(
      "Brevo welcome: set BREVO_CUSTOMER_WELCOME_WHATSAPP_TEMPLATE_ID and/or BREVO_CUSTOMER_WELCOME_EMAIL_TEMPLATE_ID.",
    );
    return;
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as ICustomerModuleService;
  let customer: Awaited<ReturnType<typeof customerModule.retrieveCustomer>>;
  try {
    customer = await customerModule.retrieveCustomer(customerId);
  } catch (e) {
    logger.warn(
      `Brevo welcome: could not load customer ${customerId}: ${e instanceof Error ? e.message : e}`,
    );
    return;
  }

  const meta = { ...(customer.metadata || {}) } as Record<string, unknown>;
  const prev = meta.brevo_welcome as BrevoWelcomeMeta | undefined;
  if (prev?.sent_at) {
    return;
  }

  const first = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "there";
  const storeUrl = stripQuotes(process.env.STORE_PUBLIC_URL ?? "").replace(/\/$/, "");

  await createNotification({
    type: "account_registered",
    customer_id: customerId,
    email: customer.email ?? undefined,
    title: "Welcome to Amby Luxe",
    body: "Your account is ready. You can now place orders and track updates from your account.",
    metadata: { store_url: storeUrl || undefined },
  });

  const persist = async (patch: BrevoWelcomeMeta) => {
    meta.brevo_welcome = { ...prev, ...patch, sent_at: new Date().toISOString() };
    try {
      await customerModule.updateCustomers(customerId, { metadata: meta });
    } catch (e) {
      logger.warn(
        `Brevo welcome: metadata save failed: ${e instanceof Error ? e.message : e}`,
      );
    }
  };

  if (waTpl && customer.phone) {
    const digits = phoneToBrevoWhatsappRecipient(customer.phone);
    if (digits) {
      const r = await brevoSendWhatsappTemplate({
        recipientDigits: digits,
        templateId: waTpl,
        templateParams: {
          FIRSTNAME: first.split(" ")[0] || first,
          STORE_URL: storeUrl,
        },
      });
      if (r.ok) {
        logger.info(`Brevo welcome: WhatsApp sent to customer ${customerId}`);
        await persist({ channel: "whatsapp" });
        return;
      }
      logger.warn(`Brevo welcome: WhatsApp failed: ${r.message}`);
      await persist({ last_error: r.message });
    }
  }

  if (emailTpl && isValidEmail(customer.email)) {
    const r = await brevoSendTransactionalEmail({
      toEmail: customer.email!,
      toName: first,
      subject: "Welcome",
      htmlContent: "<p>Welcome</p>",
      templateId: emailTpl,
      templateParams: {
        FIRSTNAME: first.split(" ")[0] || first,
        STORE_URL: storeUrl,
      },
    });
    if (r.ok) {
      logger.info(`Brevo welcome: email sent to customer ${customerId}`);
      await persist({ channel: "email" });
      return;
    }
    logger.warn(`Brevo welcome: email failed: ${r.message}`);
    await persist({ last_error: r.message });
  }
}

export const config: SubscriberConfig = {
  event: CustomerWorkflowEvents.CREATED,
};
