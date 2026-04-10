import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type NewsletterSubscriberStatus = "subscribed" | "unsubscribed";

export type NewsletterSubscriberRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  status: NewsletterSubscriberStatus;
  email: string;
  source: "storefront_footer";
  unsubscribe_reason?: string;
};

type StorePayload = { subscribers: NewsletterSubscriberRecord[] };

const STORE_DIR = path.join(process.cwd(), ".medusa");
const STORE_FILE = path.join(STORE_DIR, "newsletter-subscribers.json");

async function ensureStore(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    const initial: StorePayload = { subscribers: [] };
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<StorePayload> {
  await ensureStore();
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StorePayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.subscribers)) {
      return { subscribers: [] };
    }
    return parsed;
  } catch {
    return { subscribers: [] };
  }
}

async function writeStore(payload: StorePayload): Promise<void> {
  await ensureStore();
  await writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function upsertNewsletterSubscriber(input: {
  email: string;
}): Promise<NewsletterSubscriberRecord> {
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const store = await readStore();
  const idx = store.subscribers.findIndex((s) => s.email === email);

  if (idx >= 0) {
    const prev = store.subscribers[idx];
    const next: NewsletterSubscriberRecord = {
      ...prev,
      status: "subscribed",
      updated_at: now,
      unsubscribe_reason: undefined,
    };
    store.subscribers[idx] = next;
    await writeStore(store);
    return next;
  }

  const next: NewsletterSubscriberRecord = {
    id: `ns_${crypto.randomUUID().replace(/-/g, "")}`,
    created_at: now,
    updated_at: now,
    status: "subscribed",
    email,
    source: "storefront_footer",
  };
  store.subscribers.unshift(next);
  await writeStore(store);
  return next;
}

export async function listNewsletterSubscribers(params?: {
  status?: NewsletterSubscriberStatus;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  subscribers: NewsletterSubscriberRecord[];
  count: number;
  limit: number;
  offset: number;
}> {
  const status = params?.status;
  const q = params?.q?.trim().toLowerCase() ?? "";
  const limit = Math.min(500, Math.max(1, params?.limit ?? 100));
  const offset = Math.max(0, params?.offset ?? 0);

  const store = await readStore();
  let rows = [...store.subscribers];
  if (status) rows = rows.filter((s) => s.status === status);
  if (q) {
    rows = rows.filter((s) => [s.email, s.status].join(" ").toLowerCase().includes(q));
  }
  const count = rows.length;
  return {
    subscribers: rows.slice(offset, offset + limit),
    count,
    limit,
    offset,
  };
}

export async function updateNewsletterSubscriber(
  id: string,
  updates: Partial<Pick<NewsletterSubscriberRecord, "status" | "unsubscribe_reason">>,
): Promise<NewsletterSubscriberRecord | null> {
  const store = await readStore();
  const idx = store.subscribers.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const prev = store.subscribers[idx];
  const next: NewsletterSubscriberRecord = {
    ...prev,
    status: updates.status ?? prev.status,
    unsubscribe_reason: updates.unsubscribe_reason ?? prev.unsubscribe_reason,
    updated_at: new Date().toISOString(),
  };
  store.subscribers[idx] = next;
  await writeStore(store);
  return next;
}
