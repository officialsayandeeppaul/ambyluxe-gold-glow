import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createContactMessage } from "../../../lib/contact-messages-store";
import { createNotification } from "../../../lib/notifications-store";

const SUBJECT_SET = new Set(["general", "bespoke", "order", "appointment", "other"]);

function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * POST /store/contact-messages
 * Stores storefront "Send Us a Message" submissions for Medusa Admin inbox.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 200).toLowerCase();
  const phone = cleanText(body.phone, 40);
  const subject = cleanText(body.subject, 40).toLowerCase();
  const message = cleanText(body.message, 5000);

  if (!name) return res.status(400).json({ message: "Name is required." });
  if (!isEmail(email)) return res.status(400).json({ message: "A valid email is required." });
  if (!SUBJECT_SET.has(subject)) return res.status(400).json({ message: "Choose a valid subject." });
  if (message.length < 8) {
    return res.status(400).json({ message: "Message is too short. Please add more detail." });
  }

  const saved = await createContactMessage({
    name,
    email,
    phone: phone || undefined,
    subject,
    message,
  });

  await createNotification({
    type: "contact_message_created",
    email,
    title: "Contact request received",
    body: "Thanks for contacting us. Our team will respond here once reviewed.",
    metadata: {
      contact_message_id: saved.id,
      subject: saved.subject,
      status: saved.status,
    },
  });

  return res.status(200).json({ message: saved });
}
