/**
 * Fixed keys the storefront reads from Medusa → Product → Metadata (key/value).
 * Values are always strings in Admin; for booleans use exactly `true` or `false` (lowercase).
 */
export type MetadataFieldType = 'boolean' | 'text' | 'number' | 'json';

export interface ProductMetadataKeyDef {
  key: string;
  label: string;
  type: MetadataFieldType;
  /** What changes on the website */
  storefront: string;
  /** Example value to paste in Admin */
  example: string;
}

export const PRODUCT_METADATA_KEYS: ProductMetadataKeyDef[] = [
  {
    key: 'tagline',
    label: 'Tagline',
    type: 'text',
    storefront: 'Small gold line above the product title (e.g. collection name).',
    example: 'Timeless',
  },
  {
    key: 'storefront_search',
    label: 'Search phrases',
    type: 'text',
    storefront:
      'Optional extra keywords for site search (comma or newline separated, or JSON array). ' +
      'Use layman terms, Hindi, or campaigns — updates live from Admin with the catalogue.',
    example: 'sone ki bali, gold hoop, wedding gift, SKU-123',
  },
  {
    key: 'details',
    label: 'Details bullets',
    type: 'json',
    storefront: 'Bullet list under the description on the product page.',
    example: '["Line 1","Line 2"] or paste multiple lines (one per line)',
  },
  {
    key: 'is_new',
    label: 'New badge',
    type: 'boolean',
    storefront: 'Shows the NEW tag on the product image.',
    example: 'true or false',
  },
  {
    key: 'is_bestseller',
    label: 'Bestseller',
    type: 'boolean',
    storefront: 'Used for sorting; helps pick “Curated” items if none are marked featured.',
    example: 'true or false',
  },
  {
    key: 'featured',
    label: 'Featured / Curated',
    type: 'boolean',
    storefront:
      'Homepage “Curated” strip + “Curated for you” at bottom of product pages. Turn on for pieces you want promoted.',
    example: 'true or false',
  },
  {
    key: 'featured_order',
    label: 'Curated order',
    type: 'number',
    storefront: 'Order in Curated sections (1 = first). Only matters if featured is true.',
    example: '1',
  },
  {
    key: 'compare_at_price',
    label: 'MRP (compare-at)',
    type: 'number',
    storefront:
      'MRP in rupees for strikethrough when the sale price is lower. Set on **product** metadata for all variants, or add the same key on a **variant** (Metadata) to override for that SKU only.',
    example: '320000',
  },
  {
    key: 'trust_badges',
    label: 'Trust row',
    type: 'json',
    storefront: 'Up to 3 lines under Add to cart. In Medusa Admin, use the icon dropdowns (truck / shield / rotate-ccw).',
    example:
      '[{"label":"Free Shipping","icon":"truck"},{"label":"Lifetime Warranty","icon":"shield"},{"label":"30-Day Returns","icon":"rotate-ccw"}]',
  },
];

export const CURATED_HELP =
  'Curated pieces come from products with metadata featured = true, sorted by featured_order (1 first). Homepage “Curated” and PDP “Curated for you” use the same rules.';
