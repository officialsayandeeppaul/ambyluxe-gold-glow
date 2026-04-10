import type { Product } from '@/lib/store';
import { slugifyProductSegment } from '@/lib/productUrl';

/** Stable slug for `?category=` / `/categories/{slug}` from a display label. */
export function categoryParamFromLabel(label: string): string {
  return slugifyProductSegment(label);
}

/** Human-readable chip title from a URL param (e.g. `rings` → `Rings`). */
export function formatCategoryParamLabel(param: string): string {
  return param
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Whether a product belongs to the category selected in the URL (`?category=`).
 * Matches Medusa handle, id, display name, or slugified name.
 */
export function productMatchesCategoryParam(
  p: Product,
  param: string | null | undefined,
): boolean {
  if (!param?.trim()) return true;
  const raw = param.trim();
  const norm = slugifyProductSegment(raw);

  const ch = p.categoryHandle?.trim();
  if (ch) {
    if (slugifyProductSegment(ch) === norm) return true;
    if (ch.toLowerCase() === raw.toLowerCase()) return true;
  }

  const cid = p.categoryId?.trim();
  if (cid && cid.toLowerCase() === raw.toLowerCase()) return true;

  const name = p.category?.trim() ?? '';
  if (name) {
    if (slugifyProductSegment(name) === norm) return true;
    if (name.toLowerCase() === raw.toLowerCase()) return true;
  }

  return false;
}

/** Whether a catalogue category pill matches the active `?category=` value. */
export function categoryLabelIsActive(label: string, param: string | null | undefined): boolean {
  if (!param?.trim()) return false;
  const raw = param.trim();
  return (
    slugifyProductSegment(label) === slugifyProductSegment(raw) ||
    label.toLowerCase() === raw.toLowerCase()
  );
}

/** Same merchandising category (Medusa handle/id or matching display / slug). */
export function productsShareCategory(a: Product, b: Product): boolean {
  const h1 = a.categoryHandle?.trim();
  const h2 = b.categoryHandle?.trim();
  if (h1 && h2 && h1 === h2) return true;
  const id1 = a.categoryId?.trim();
  const id2 = b.categoryId?.trim();
  if (id1 && id2 && id1 === id2) return true;
  return (
    slugifyProductSegment(a.category) === slugifyProductSegment(b.category) ||
    a.category.toLowerCase() === b.category.toLowerCase()
  );
}
