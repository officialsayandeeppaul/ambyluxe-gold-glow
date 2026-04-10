import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  listContactMessages,
  type ContactMessageStatus,
} from "../../../lib/contact-messages-store";

function readStatus(v: unknown): ContactMessageStatus | undefined {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "new" || s === "in_progress" || s === "resolved") return s;
  return undefined;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = readStatus(req.query.status);
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const rows = await listContactMessages({
    status,
    q,
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
  });
  return res.status(200).json(rows);
}
