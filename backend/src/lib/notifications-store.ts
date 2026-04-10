import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type NotificationType =
  | "account_registered"
  | "order_placed"
  | "order_fulfillment_created"
  | "contact_message_created"
  | "admin_reply"
  | "newsletter_subscribed"
  | "newsletter_status_updated";

export type NotificationRecord = {
  id: string;
  created_at: string;
  read_at: string | null;
  type: NotificationType;
  title: string;
  body: string;
  customer_id?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

type NotificationStorePayload = {
  notifications: NotificationRecord[];
};

const STORE_DIR = path.join(process.cwd(), ".medusa");
const STORE_FILE = path.join(STORE_DIR, "notifications.json");
const MAX_NOTIFICATIONS = 20000;

async function ensureStore(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const initial: NotificationStorePayload = { notifications: [] };
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<NotificationStorePayload> {
  await ensureStore();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as NotificationStorePayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.notifications)) {
      return { notifications: [] };
    }
    return parsed;
  } catch {
    return { notifications: [] };
  }
}

async function writeStore(payload: NotificationStorePayload): Promise<void> {
  await ensureStore();
  await writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeEmail(email: string | undefined): string | undefined {
  const e = email?.trim().toLowerCase();
  return e ? e : undefined;
}

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  customer_id?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const next: NotificationRecord = {
    id: `ntf_${crypto.randomUUID().replace(/-/g, "")}`,
    created_at: now,
    read_at: null,
    type: input.type,
    title: input.title.trim().slice(0, 160) || "Notification",
    body: input.body.trim().slice(0, 4000) || "",
    customer_id: input.customer_id?.trim() || undefined,
    email: normalizeEmail(input.email),
    metadata: input.metadata,
  };

  const store = await readStore();
  store.notifications.unshift(next);
  if (store.notifications.length > MAX_NOTIFICATIONS) {
    store.notifications = store.notifications.slice(0, MAX_NOTIFICATIONS);
  }
  await writeStore(store);
  return next;
}

function belongsToTarget(
  row: NotificationRecord,
  target: { customer_id?: string; email?: string },
): boolean {
  const targetCustomerId = target.customer_id?.trim();
  const targetEmail = normalizeEmail(target.email);
  if (targetCustomerId && row.customer_id && row.customer_id === targetCustomerId) return true;
  if (targetEmail && row.email && normalizeEmail(row.email) === targetEmail) return true;
  return false;
}

export async function listNotificationsForTarget(
  target: { customer_id?: string; email?: string },
  params?: { unread?: boolean; limit?: number; offset?: number },
): Promise<{ notifications: NotificationRecord[]; count: number; unread_count: number }> {
  const store = await readStore();
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const offset = Math.max(0, params?.offset ?? 0);
  const unreadOnly = params?.unread === true;

  const mine = store.notifications.filter((row) => belongsToTarget(row, target));
  const unreadCount = mine.filter((row) => row.read_at == null).length;
  const filtered = unreadOnly ? mine.filter((row) => row.read_at == null) : mine;
  const count = filtered.length;

  return {
    notifications: filtered.slice(offset, offset + limit),
    count,
    unread_count: unreadCount,
  };
}

export async function markNotificationReadStateForTarget(input: {
  id: string;
  target: { customer_id?: string; email?: string };
  read: boolean;
}): Promise<NotificationRecord | null> {
  const store = await readStore();
  const idx = store.notifications.findIndex((row) => row.id === input.id);
  if (idx < 0) return null;

  const current = store.notifications[idx];
  if (!belongsToTarget(current, input.target)) return null;

  const next: NotificationRecord = {
    ...current,
    read_at: input.read ? current.read_at ?? new Date().toISOString() : null,
  };
  store.notifications[idx] = next;
  await writeStore(store);
  return next;
}

export async function markAllNotificationsReadForTarget(target: {
  customer_id?: string;
  email?: string;
}): Promise<{ updated: number }> {
  const store = await readStore();
  let updated = 0;
  const now = new Date().toISOString();
  store.notifications = store.notifications.map((row) => {
    if (!belongsToTarget(row, target) || row.read_at) return row;
    updated += 1;
    return { ...row, read_at: now };
  });
  if (updated > 0) await writeStore(store);
  return { updated };
}
