import type { Product } from '@/lib/store';

/**
 * Normalizes a URL segment or title into a comparable slug (lowercase, hyphens, ASCII).
 * Handles encoded paths and human phrases like "Golden Cascades Earrings".
 */
export function slugifyProductSegment(raw: string): string {
  let s = raw.trim();
  try {
    s = decodeURIComponent(s.replace(/\+/g, '%20'));
  } catch {
    /* keep s */
  }
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Canonical PDP path: `/products/{handle}` when handle exists, else legacy `/product/{id}`. */
export function productPath(product: Pick<Product, 'id' | 'handle'>): string {
  const h = product.handle?.trim();
  if (h) {
    const safe = slugifyProductSegment(h) || h;
    return `/products/${safe}`;
  }
  return `/product/${encodeURIComponent(product.id)}`;
}
