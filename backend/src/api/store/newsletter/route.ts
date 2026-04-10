import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { upsertNewsletterSubscriber } from "../../../lib/newsletter-subscribers-store";
import { createNotification } from "../../../lib/notifications-store";

function cleanEmail(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * POST /store/newsletter
 * Subscribes an email to the newsletter list.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = cleanEmail(body.email);

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  const saved = await upsertNewsletterSubscriber({ email });
  await createNotification({
    type: "newsletter_subscribed",
    email,
    title: "Newsletter subscription confirmed",
    body: "You are subscribed to Amby Luxe newsletter updates.",
    metadata: {
      newsletter_subscriber_id: saved.id,
      status: saved.status,
    },
  });
  return res.status(200).json({ subscriber: saved });
}
