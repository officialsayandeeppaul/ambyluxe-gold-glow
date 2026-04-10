import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  listNewsletterSubscribers,
  type NewsletterSubscriberStatus,
} from "../../../lib/newsletter-subscribers-store";

function readStatus(v: unknown): NewsletterSubscriberStatus | undefined {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "subscribed" || s === "unsubscribed") return s;
  return undefined;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = readStatus(req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const limit = Number(req.query.limit ?? 100);
  const offset = Number(req.query.offset ?? 0);
  const rows = await listNewsletterSubscribers({
    status,
    q,
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  });
  return res.status(200).json(rows);
}
