const baseUrl = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, "") ?? "http://localhost:9000";
const publishableKey = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY?.trim() ?? "";

export async function submitContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const res = await fetch(`${baseUrl}/store/contact-messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let msg = "Could not send message. Please try again.";
    try {
      const j = (await res.json()) as { message?: string };
      if (typeof j?.message === "string" && j.message.trim()) msg = j.message;
    } catch {
      // keep fallback
    }
    throw new Error(msg);
  }
}
