import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type ContactMessageStatus = "new" | "in_progress" | "resolved";

export type ContactMessageRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  status: ContactMessageStatus;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: "storefront_contact";
  admin_note?: string;
};

type ContactStorePayload = {
  messages: ContactMessageRecord[];
};

const STORE_DIR = path.join(process.cwd(), ".medusa");
const STORE_FILE = path.join(STORE_DIR, "contact-messages.json");

async function ensureStore(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const initial: ContactStorePayload = { messages: [] };
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<ContactStorePayload> {
  await ensureStore();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as ContactStorePayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.messages)) {
      return { messages: [] };
    }
    return parsed;
  } catch {
    return { messages: [] };
  }
}

async function writeStore(payload: ContactStorePayload): Promise<void> {
  await ensureStore();
  await writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function createContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<ContactMessageRecord> {
  const now = new Date().toISOString();
  const next: ContactMessageRecord = {
    id: `cm_${crypto.randomUUID().replace(/-/g, "")}`,
    created_at: now,
    updated_at: now,
    status: "new",
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject: input.subject,
    message: input.message,
    source: "storefront_contact",
  };
  const store = await readStore();
  store.messages.unshift(next);
  await writeStore(store);
  return next;
}

export async function listContactMessages(params?: {
  status?: ContactMessageStatus;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ messages: ContactMessageRecord[]; count: number; limit: number; offset: number }> {
  const status = params?.status;
  const q = params?.q?.trim().toLowerCase() ?? "";
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const offset = Math.max(0, params?.offset ?? 0);

  const store = await readStore();
  let rows = [...store.messages];
  if (status) rows = rows.filter((m) => m.status === status);
  if (q) {
    rows = rows.filter((m) =>
      [m.name, m.email, m.phone, m.subject, m.message, m.admin_note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  const count = rows.length;
  return {
    messages: rows.slice(offset, offset + limit),
    count,
    limit,
    offset,
  };
}

export async function updateContactMessage(
  id: string,
  updates: Partial<Pick<ContactMessageRecord, "status" | "admin_note">>,
): Promise<ContactMessageRecord | null> {
  const store = await readStore();
  const idx = store.messages.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const prev = store.messages[idx];
  const next: ContactMessageRecord = {
    ...prev,
    status: updates.status ?? prev.status,
    admin_note: updates.admin_note ?? prev.admin_note,
    updated_at: new Date().toISOString(),
  };
  store.messages[idx] = next;
  await writeStore(store);
  return next;
}

export async function retrieveContactMessageById(
  id: string,
): Promise<ContactMessageRecord | null> {
  const store = await readStore();
  const row = store.messages.find((m) => m.id === id);
  return row ?? null;
}
