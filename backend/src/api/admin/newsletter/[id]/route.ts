import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  updateNewsletterSubscriber,
  type NewsletterSubscriberStatus,
} from "../../../../lib/newsletter-subscribers-store";
import { createNotification } from "../../../../lib/notifications-store";

function readStatus(v: unknown): NewsletterSubscriberStatus | undefined {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "subscribed" || s === "unsubscribed") return s;
  return undefined;
}

function cleanReason(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, 500);
  return t || "";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ message: "Missing subscriber id." });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const status = readStatus(body.status);
  const reason = cleanReason(body.unsubscribe_reason);
  if (!status && reason == null) {
    return res.status(400).json({ message: "Provide status and/or unsubscribe_reason." });
  }

  const updated = await updateNewsletterSubscriber(id, {
    status,
    unsubscribe_reason: reason,
  });
  if (!updated) return res.status(404).json({ message: "Subscriber not found." });

  const updates: string[] = [];
  if (status) updates.push(`status changed to ${status}`);
  if (reason != null) updates.push("note updated");
  if (updates.length > 0) {
    await createNotification({
      type: "newsletter_status_updated",
      email: updated.email,
      title: "Newsletter preferences updated",
      body: `Your newsletter profile was updated: ${updates.join(" and ")}.`,
      metadata: {
        newsletter_subscriber_id: updated.id,
        status: updated.status,
      },
    });
  }

  return res.status(200).json({ subscriber: updated });
}
