import type { Product } from '@/lib/store';

/** Grammar noise only — jewellery terms stay in your Medusa titles / `storefront_search` metadata. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'as',
  'by',
  'with',
  'from',
  'is',
  'are',
  'was',
  'be',
  'this',
  'that',
  'it',
  'i',
  'you',
  'we',
  'my',
  'our',
  'your',
]);

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Meaningful query tokens (stopwords dropped). */
export function tokenizeSearchQuery(raw: string): string[] {
  const n = normalizeSearchText(raw);
  if (!n) return [];
  return n
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .filter((t) => t.length >= 2 || /^\d{2,}$/.test(t));
}

/** @returns true if at least one token would be used */
export function hasSearchTokens(raw: string): boolean {
  return tokenizeSearchQuery(raw).length > 0;
}

/** At most one insert, delete, or substitute between two strings. */
function isAtMostOneEditApart(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (edits >= 1) return false;
    edits++;
    if (la > lb) i++;
    else if (lb > la) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function fuzzyWordMatch(hayWord: string, token: string): boolean {
  if (token.length < 4 || hayWord.length < 4) return false;
  if (hayWord.includes(token) || token.includes(hayWord)) return false;
  return isAtMostOneEditApart(token, hayWord);
}

function tokenMatchesInHaystack(haystack: string, token: string): boolean {
  if (!token) return true;
  if (haystack.includes(token)) return true;
  const words = haystack.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (token.length >= 3 && w.startsWith(token)) return true;
    if (fuzzyWordMatch(w, token)) return true;
  }
  return false;
}

/**
 * Everything the shopper might type against — all from live `Product` / Medusa (plus optional
 * `storefront_search` metadata). No hardcoded jewellery synonym lists.
 */
export function buildProductSearchBlob(p: Product): string {
  const parts: string[] = [
    p.name,
    p.handle ?? '',
    p.tagline ?? '',
    p.category,
    p.categoryHandle ?? '',
    p.collection ?? '',
    p.collectionHandle ?? '',
    stripHtml(p.description ?? ''),
    p.material ?? '',
    p.variantTitle ?? '',
    p.variantSku ?? '',
    ...(p.details ?? []),
    ...(p.searchKeywords ?? []),
    ...(p.trustBadges?.map((t) => t.label) ?? []),
    p.originCountry ? String(p.originCountry) : '',
  ];
  if (p.price != null) parts.push(String(Math.round(p.price)));
  if (p.variants) {
    for (const v of p.variants) {
      parts.push(v.title ?? '', v.sku ?? '', v.material ?? '');
    }
  }
  if (p.optionGroups) {
    for (const g of p.optionGroups) {
      parts.push(g.title);
      for (const x of g.values) parts.push(x.value);
    }
  }
  return normalizeSearchText(parts.join(' '));
}

function searchScore(p: Product, haystack: string, tokens: string[]): number {
  const title = normalizeSearchText(p.name);
  const tag = normalizeSearchText(p.tagline ?? '');
  const handle = normalizeSearchText(p.handle ?? '');
  const cat = normalizeSearchText(p.category);
  const kw = normalizeSearchText((p.searchKeywords ?? []).join(' '));
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 120;
    if (tag.includes(t)) score += 70;
    if (handle.includes(t)) score += 55;
    if (cat.includes(t)) score += 45;
    if (normalizeSearchText(p.collection ?? '').includes(t)) score += 40;
    if (kw.includes(t)) score += 85;
    if (haystack.includes(t)) score += 18;
  }
  return score;
}

/**
 * Filter + rank products. Data is whatever `useProducts()` last fetched from Medusa (or demo
 * static JSON only when Medusa is not configured).
 */
export function searchProducts(products: Product[], rawQuery: string): Product[] {
  const tokens = tokenizeSearchQuery(rawQuery);
  if (!tokens.length) return [...products];

  const scored: { p: Product; hay: string; score: number }[] = [];
  for (const p of products) {
    const hay = buildProductSearchBlob(p);
    if (!tokens.every((t) => tokenMatchesInHaystack(hay, t))) continue;
    scored.push({ p, hay, score: searchScore(p, hay, tokens) });
  }
  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.map((s) => s.p);
}
