const baseUrl = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, "") ?? "http://localhost:9000";
const publishableKey = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? "";

export async function subscribeNewsletter(email: string): Promise<void> {
  const res = await fetch(`${baseUrl}/store/newsletter`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    let msg = "Could not subscribe right now. Please try again.";
    try {
      const j = (await res.json()) as { message?: string };
      if (typeof j?.message === "string" && j.message.trim()) msg = j.message;
    } catch {
      // fallback
    }
    throw new Error(msg);
  }
}
