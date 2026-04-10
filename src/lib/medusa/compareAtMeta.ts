/** Product/variant metadata MRP in rupees (major). Used for strikethrough + INR price heuristic. */
export function compareAtPriceFromMeta(
  meta: Record<string, unknown> | null | undefined,
): number | undefined {
  if (!meta) return undefined;
  const raw = meta.compare_at_price ?? meta.compare_at;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number.parseFloat(raw.replace(/,/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
