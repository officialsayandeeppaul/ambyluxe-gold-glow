/**
 * Admin API bodies may be flat or nested under `product` depending on the client.
 */
export function extractProductDescription(body: unknown): {
  present: boolean;
  value: string | undefined;
} {
  if (!body || typeof body !== "object") {
    return { present: false, value: undefined };
  }
  const b = body as Record<string, unknown>;
  if ("description" in b) {
    const v = b.description;
    if (v === null) return { present: true, value: undefined };
    if (typeof v === "string") return { present: true, value: v };
    return { present: true, value: undefined };
  }
  if (b.product && typeof b.product === "object") {
    const p = b.product as Record<string, unknown>;
    if ("description" in p) {
      const v = p.description;
      if (v === null) return { present: true, value: undefined };
      if (typeof v === "string") return { present: true, value: v };
      return { present: true, value: undefined };
    }
  }
  return { present: false, value: undefined };
}

export function isNonEmptyDescription(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
