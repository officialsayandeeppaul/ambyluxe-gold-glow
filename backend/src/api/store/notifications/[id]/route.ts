import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { markNotificationReadStateForTarget } from "../../../../lib/notifications-store";
import { resolveNotificationTargetFromStoreAuth } from "../../../../lib/notification-target";

function readReadState(v: unknown): boolean | null {
  if (typeof v !== "boolean") return null;
  return v === true ? true : null;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const target = await resolveNotificationTargetFromStoreAuth(req);
  if (!target?.customer_id) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ message: "Missing notification id." });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const read = readReadState(body.read);
  if (read == null) {
    return res
      .status(400)
      .json({ message: "Only read=true is allowed. Notifications cannot be marked unread." });
  }

  const updated = await markNotificationReadStateForTarget({
    id,
    target,
    read,
  });
  if (!updated) return res.status(404).json({ message: "Notification not found." });
  return res.status(200).json({ notification: updated });
}
