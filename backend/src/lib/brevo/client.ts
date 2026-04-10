/**
 * Brevo (Sendinblue) REST helpers — transactional email + WhatsApp.
 * @see https://developers.brevo.com/reference/sendtransacemail
 * @see https://developers.brevo.com/reference/send-whatsapp-message
 */

const BREVO_BASE = "https://api.brevo.com/v3";

function stripQuotes(v: string): string {
  return v.replace(/^["']|["']$/g, "").trim();
}

export function brevoIntegrationEnabled(): boolean {
  const v = stripQuotes(process.env.BREVO_ENABLED?.toLowerCase() ?? "");
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function brevoApiKey(): string | null {
  const k = stripQuotes(process.env.BREVO_API_KEY ?? "");
  return k || null;
}

export function brevoSenderEmail(): string | null {
  const e = stripQuotes(process.env.BREVO_SENDER_EMAIL ?? "");
  return e.includes("@") ? e : null;
}

export function brevoSenderName(): string {
  return stripQuotes(process.env.BREVO_SENDER_NAME ?? "") || "Amby Luxe Jewels";
}

export function storePublicUrl(): string {
  return stripQuotes(process.env.STORE_PUBLIC_URL ?? "") || "https://example.com";
}

async function postBrevoJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: T | null; text: string }> {
  const key = brevoApiKey();
  if (!key) {
    return { ok: false, status: 0, json: null, text: "Missing BREVO_API_KEY" };
  }
  const res = await fetch(`${BREVO_BASE}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: T | null = null;
  try {
    json = text ? (JSON.parse(text) as T) : null;
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, json, text };
}

export type BrevoSendEmailInput = {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  /** Optional Brevo template id — if set, subject/html may be ignored by Brevo in favour of template */
  templateId?: number;
  templateParams?: Record<string, string | number>;
};

export async function brevoSendTransactionalEmail(
  input: BrevoSendEmailInput,
): Promise<{ ok: boolean; message: string }> {
  const senderEmail = brevoSenderEmail();
  if (!senderEmail) {
    return { ok: false, message: "Set BREVO_SENDER_EMAIL (verified sender in Brevo)." };
  }

  const body: Record<string, unknown> = {
    sender: { name: brevoSenderName(), email: senderEmail },
    to: [{ email: input.toEmail.trim(), name: input.toName?.trim() || undefined }],
  };

  if (input.templateId != null && Number.isFinite(input.templateId)) {
    body.templateId = input.templateId;
    if (input.templateParams && Object.keys(input.templateParams).length > 0) {
      body.params = input.templateParams;
    }
  } else {
    body.subject = input.subject;
    body.htmlContent = input.htmlContent;
    if (input.textContent) body.textContent = input.textContent;
  }

  const r = await postBrevoJson<{ messageId?: string }>("/smtp/email", body);
  if (!r.ok) {
    return {
      ok: false,
      message: r.json && typeof (r.json as { message?: string }).message === "string"
        ? (r.json as { message: string }).message
        : r.text.slice(0, 500),
    };
  }
  return { ok: true, message: "sent" };
}

/**
 * Send transactional email; if `templateId` fails (e.g. Marketing template id ≠ SMTP template), retry HTML body.
 */
export async function brevoSendTransactionalEmailWithTemplateFallback(
  input: BrevoSendEmailInput,
): Promise<{ ok: boolean; message: string; usedHtmlFallback: boolean }> {
  if (input.templateId == null || !Number.isFinite(input.templateId)) {
    const r = await brevoSendTransactionalEmail(input);
    return { ...r, usedHtmlFallback: false };
  }

  const withTpl = await brevoSendTransactionalEmail(input);
  if (withTpl.ok) {
    return { ok: true, message: withTpl.message, usedHtmlFallback: false };
  }

  const fallback = await brevoSendTransactionalEmail({
    toEmail: input.toEmail,
    toName: input.toName,
    subject: input.subject,
    htmlContent: input.htmlContent,
    textContent: input.textContent,
  });
  if (fallback.ok) {
    return {
      ok: true,
      message: `template failed (${withTpl.message.slice(0, 120)}); sent built-in HTML instead`,
      usedHtmlFallback: true,
    };
  }
  return {
    ok: false,
    message: `template: ${withTpl.message}; html fallback: ${fallback.message}`,
    usedHtmlFallback: true,
  };
}

/** E.164-ish digits only, no + — e.g. 9198xxxxxxxx for India */
export function phoneToBrevoWhatsappRecipient(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export type BrevoWhatsappInput = {
  recipientDigits: string;
  templateId: number;
  templateParams?: Record<string, string>;
};

export async function brevoSendWhatsappTemplate(
  input: BrevoWhatsappInput,
): Promise<{ ok: boolean; message: string }> {
  const sender = stripQuotes(process.env.BREVO_WHATSAPP_SENDER_NUMBER ?? "").replace(/\D/g, "");
  if (!sender) {
    return { ok: false, message: "Set BREVO_WHATSAPP_SENDER_NUMBER (digits, country code, no +)." };
  }

  const body: Record<string, unknown> = {
    senderNumber: sender,
    contactNumbers: [input.recipientDigits],
    templateId: input.templateId,
  };
  if (input.templateParams && Object.keys(input.templateParams).length > 0) {
    body.params = input.templateParams;
  }

  const r = await postBrevoJson<{ messageId?: string }>("/whatsapp/sendMessage", body);
  if (!r.ok) {
    return {
      ok: false,
      message: r.json && typeof (r.json as { message?: string }).message === "string"
        ? (r.json as { message: string }).message
        : r.text.slice(0, 500),
    };
  }
  return { ok: true, message: "sent" };
}
