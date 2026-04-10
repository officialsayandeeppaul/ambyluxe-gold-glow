import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://apiv2.shiprocket.in";

type CachedToken = { token: string; expiresAtMs: number };
let tokenCache: CachedToken | null = null;

/** After Shiprocket returns “blocked / too many logins”, skip calling their API until this time (same Node process). */
let globalAuthLockoutUntilMs = 0;

function lockoutBackoffMs(): number {
  const v = Number(process.env.SHIPROCKET_LOCKOUT_BACKOFF_MS ?? "3600000");
  return Number.isFinite(v) && v >= 60_000 ? v : 3_600_000;
}

export function isShiprocketAccountLockoutMessage(text: string): boolean {
  return /blocked|too many failed login/i.test(text);
}

/** Clears local token cache + login backoff (e.g. after fixing .env or Shiprocket unlock). Restarting Medusa also resets this. */
export function clearShiprocketAuthLockout(): void {
  globalAuthLockoutUntilMs = 0;
  tokenCache = null;
}

export function getShiprocketAuthLockoutUntilMs(): number {
  return globalAuthLockoutUntilMs;
}

function cacheTtlMs(): number {
  const days = Number(process.env.SHIPROCKET_TOKEN_CACHE_DAYS || "9");
  return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

function apiEmail(): string | undefined {
  return (
    process.env.SHIPROCKET_API_EMAIL?.trim() ||
    process.env.SHIPROCKET_EMAIL?.trim() ||
    undefined
  );
}

function apiPassword(): string | undefined {
  const b64 = process.env.SHIPROCKET_API_PASSWORD_B64?.trim();
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8").trim();
    } catch {
      return undefined;
    }
  }
  const filePath = process.env.SHIPROCKET_API_PASSWORD_FILE?.trim();
  if (filePath) {
    try {
      const abs = resolve(process.cwd(), filePath);
      if (existsSync(abs)) {
        return readFileSync(abs, "utf8").trim();
      }
    } catch {
      return undefined;
    }
  }
  return (
    process.env.SHIPROCKET_API_PASSWORD?.trim() ||
    process.env.SHIPROCKET_PASSWORD?.trim() ||
    undefined
  );
}

export async function shiprocketLogin(): Promise<string> {
  const email = apiEmail();
  const password = apiPassword();
  if (!email || !password) {
    throw new Error(
      "Shiprocket: set email + password (SHIPROCKET_API_EMAIL / SHIPROCKET_API_PASSWORD). Passwords with $ need \\$ per $ in .env (dotenv-expand), or use SHIPROCKET_API_PASSWORD_B64, or SHIPROCKET_API_PASSWORD_FILE pointing to a one-line password file.",
    );
  }

  const now = Date.now();
  if (now < globalAuthLockoutUntilMs) {
    throw new Error(
      `Shiprocket auth: local backoff until ${new Date(globalAuthLockoutUntilMs).toISOString()} — Shiprocket blocked this API user; not calling login again yet (avoids extending lockout). Set SHIPROCKET_LOCKOUT_BACKOFF_MS or restart Medusa after Shiprocket unlocks.`,
    );
  }

  if (tokenCache && now < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(`${BASE}/v1/external/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const raw = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Shiprocket auth: non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    const msg = (body.message as string) || raw.slice(0, 500);
    let hint = "";
    if (isShiprocketAccountLockoutMessage(msg)) {
      globalAuthLockoutUntilMs = Date.now() + lockoutBackoffMs();
      clearShiprocketTokenCache();
      hint = ` Local backoff until ${new Date(globalAuthLockoutUntilMs).toISOString()}. Wait or reset API password in Shiprocket; do not spam npm run shiprocket:test-auth.`;
    } else if (
      res.status === 403 ||
      /invalid email and password/i.test(String(msg).toLowerCase())
    ) {
      hint =
        " Confirm credentials match Shiprocket → Settings → API. If the password contains $, escape each as \\$ in backend/.env or use SHIPROCKET_API_PASSWORD_B64. Run: npm run shiprocket:test-auth";
    }
    throw new Error(`Shiprocket auth failed (${res.status}): ${msg}${hint}`);
  }

  const token = body.token as string | undefined;
  if (!token) {
    throw new Error("Shiprocket auth: missing token in response");
  }

  globalAuthLockoutUntilMs = 0;
  tokenCache = {
    token,
    expiresAtMs: now + cacheTtlMs(),
  };
  return token;
}

export function clearShiprocketTokenCache(): void {
  tokenCache = null;
}

export type ShiprocketAdhocBody = Record<string, unknown>;

export async function shiprocketCreateAdhocOrder(
  payload: ShiprocketAdhocBody,
): Promise<Record<string, unknown>> {
  let token = await shiprocketLogin();
  const url = `${BASE}/v1/external/orders/create/adhoc`;

  const post = async (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });

  let res = await post(token);
  if (res.status === 401) {
    clearShiprocketTokenCache();
    token = await shiprocketLogin();
    res = await post(token);
  }

  const raw = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Shiprocket create order: non-JSON (${res.status}) ${raw.slice(0, 500)}`);
  }

  if (!res.ok) {
    const msg =
      (body.message as string) ||
      (body.errors && JSON.stringify(body.errors)) ||
      raw.slice(0, 800);
    throw new Error(`Shiprocket create order failed (${res.status}): ${msg}`);
  }

  return body;
}
