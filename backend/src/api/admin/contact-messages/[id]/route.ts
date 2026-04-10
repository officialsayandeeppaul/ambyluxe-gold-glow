import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  retrieveContactMessageById,
  updateContactMessage,
  type ContactMessageStatus,
} from "../../../../lib/contact-messages-store";
import { createNotification } from "../../../../lib/notifications-store";

function readStatus(v: unknown): ContactMessageStatus | undefined {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "new" || s === "in_progress" || s === "resolved") return s;
  return undefined;
}

function cleanNote(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, 2000);
  return t || "";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ message: "Missing message id." });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const status = readStatus(body.status);
  const adminNote = cleanNote(body.admin_note);
  if (!status && adminNote == null) {
    return res.status(400).json({ message: "Provide status and/or admin_note." });
  }

  const before = await retrieveContactMessageById(id);
  if (!before) return res.status(404).json({ message: "Message not found." });

  const updated = await updateContactMessage(id, {
    status,
    admin_note: adminNote,
  });
  if (!updated) return res.status(404).json({ message: "Message not found." });

  const statusChanged = Boolean(status && status !== before.status);
  const noteChanged = adminNote != null && adminNote !== (before.admin_note ?? "");
  const updateBits: string[] = [];
  if (statusChanged) updateBits.push(`status changed to ${updated.status.replace("_", " ")}`);
  if (noteChanged) updateBits.push("admin replied to your message");
  if (updateBits.length > 0) {
    await createNotification({
      type: "admin_reply",
      email: updated.email,
      title: "Support update from admin",
      body: `Your support request was updated: ${updateBits.join(" and ")}.`,
      metadata: {
        contact_message_id: updated.id,
        contact_subject: updated.subject,
        contact_message: updated.message,
        admin_note: updated.admin_note ?? null,
        status: updated.status,
        has_admin_note: Boolean(updated.admin_note?.trim()),
        updated_at: updated.updated_at,
      },
    });
  }
  return res.status(200).json({ message: updated });
}
