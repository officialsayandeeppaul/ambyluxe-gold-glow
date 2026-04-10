import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  listNotificationsForTarget,
  markAllNotificationsReadForTarget,
} from "../../../lib/notifications-store";
import { resolveNotificationTargetFromStoreAuth } from "../../../lib/notification-target";

function readBool(v: unknown): boolean {
  const t = typeof v === "string" ? v.trim().toLowerCase() : "";
  return t === "1" || t === "true" || t === "yes";
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const target = await resolveNotificationTargetFromStoreAuth(req);
  if (!target?.customer_id) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const unread = readBool(req.query.unread);
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const rows = await listNotificationsForTarget(target, {
    unread,
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
  });
  return res.status(200).json(rows);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const target = await resolveNotificationTargetFromStoreAuth(req);
  if (!target?.customer_id) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  if (action !== "mark_all_read") {
    return res.status(400).json({ message: "Unknown action. Use action=mark_all_read." });
  }

  const result = await markAllNotificationsReadForTarget(target);
  return res.status(200).json(result);
}
