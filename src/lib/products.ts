import { Product } from './store';

import productRing from '@/assets/product-ring.jpg';
import productNecklace from '@/assets/product-necklace.jpg';
import productEarrings from '@/assets/product-earrings.jpg';
import productBangles from '@/assets/product-bangles.jpg';
import productPendant from '@/assets/product-pendant.jpg';
import productBracelet from '@/assets/product-bracelet.jpg';
import productSapphireRing from '@/assets/product-sapphire-ring.jpg';
import productChandelierEarrings from '@/assets/product-chandelier-earrings.jpg';

/** Same catalogue as `products` — used when Directus is unavailable. */
export const staticProducts: Product[] = [
  {
    id: '1',
    handle: 'eternal-diamond-solitaire',
    name: 'Eternal Diamond Solitaire',
    price: 285000,
    originalPrice: 320000,
    image: productRing,
    images: [productRing, productRing, productRing],
    category: 'Rings',
    collection: 'Timeless',
    description: 'A breathtaking solitaire ring featuring a 2-carat brilliant-cut diamond, set in 18k white gold. The epitome of eternal elegance.',
    details: ['2-carat brilliant-cut diamond', '18k white gold setting', 'VS1 clarity, F color', 'GIA certified'],
    isNew: true,
    isBestseller: true,
    featured: true,
    featuredRank: 1,
    currencyCode: 'INR',
  },
  {
    id: '2',
    name: 'Royal Heritage Necklace',
    price: 425000,
    image: productNecklace,
    images: [productNecklace, productNecklace, productNecklace],
    category: 'Necklaces',
    collection: 'Heritage',
    description: 'An exquisite statement necklace inspired by royal heritage, featuring intricate gold filigree work adorned with natural emeralds and diamonds.',
    details: ['Natural Colombian emeralds', 'Brilliant-cut diamonds', 'Hand-crafted filigree', '22k gold'],
    isBestseller: true,
    featured: true,
    featuredRank: 2,
    currencyCode: 'INR',
  },
  {
    id: '3',
    handle: 'celestial-pearl-drops',
    name: 'Celestial Pearl Drops',
    price: 95000,
    originalPrice: 115000,
    image: productEarrings,
    images: [productEarrings, productEarrings],
    category: 'Earrings',
    collection: 'Celestial',
    description: 'Elegant drop earrings featuring lustrous South Sea pearls suspended from diamond-encrusted crescents in 18k yellow gold.',
    details: ['South Sea pearls (12mm)', '18k yellow gold', 'Diamond accents (0.5 ctw)', 'Secure butterfly backs'],
    isNew: true,
    featured: true,
    featuredRank: 3,
    currencyCode: 'INR',
  },
  {
    id: '4',
    handle: 'maharani-bangles-set',
    name: 'Maharani Bangles Set',
    price: 185000,
    image: productBangles,
    category: 'Bangles',
    collection: 'Heritage',
    description: 'A luxurious set of three hand-crafted bangles featuring traditional Indian artistry with contemporary elegance. Ruby and diamond accents.',
    details: ['Set of 3 bangles', 'Natural rubies', 'Diamond melee', '22k gold'],
    featured: true,
    featuredRank: 4,
    currencyCode: 'INR',
  },
  {
    id: '5',
    handle: 'aurora-diamond-pendant',
    name: 'Aurora Diamond Pendant',
    price: 165000,
    image: productPendant,
    category: 'Pendants',
    collection: 'Celestial',
    description: 'A mesmerizing pendant featuring a 1.5-carat pear-shaped diamond surrounded by a halo of smaller brilliants, evoking the northern lights.',
    details: ['1.5-carat pear diamond', 'Diamond halo setting', '18k white gold', 'Includes 18" chain'],
    isNew: true,
    isBestseller: true,
    featured: true,
    featuredRank: 5,
    currencyCode: 'INR',
  },
  {
    id: '6',
    handle: 'infinity-tennis-bracelet',
    name: 'Infinity Tennis Bracelet',
    price: 245000,
    image: productBracelet,
    category: 'Bracelets',
    collection: 'Timeless',
    description: 'A classic tennis bracelet reimagined with 5 carats of round brilliant diamonds set in platinum, symbolizing infinite love.',
    details: ['5 carats total weight', 'Round brilliant diamonds', 'Platinum setting', 'Secure box clasp'],
    isBestseller: true,
  },
  {
    id: '7',
    handle: 'sapphire-cocktail-ring',
    name: 'Sapphire Cocktail Ring',
    price: 195000,
    image: productSapphireRing,
    category: 'Rings',
    collection: 'Heritage',
    description: 'A stunning cocktail ring featuring a 3-carat Ceylon sapphire surrounded by baguette and round diamonds in an art deco setting.',
    details: ['3-carat Ceylon sapphire', 'Baguette & round diamonds', '18k white gold', 'Art deco design'],
  },
  {
    id: '8',
    handle: 'golden-cascades-earrings',
    name: 'Golden Cascades Earrings',
    price: 125000,
    originalPrice: 145000,
    image: productChandelierEarrings,
    category: 'Earrings',
    collection: 'Timeless',
    description: 'Dramatic chandelier earrings featuring cascading golden leaves adorned with champagne diamonds for an unforgettable statement.',
    details: ['Champagne diamonds', '18k yellow gold', 'Chandelier design', 'Post with omega backs'],
    isNew: true,
  },
];

/** @deprecated Use `staticProducts` for clarity; kept for existing imports. */
export const products = staticProducts;

export const collections = [
  {
    id: 'timeless',
    name: 'Timeless',
    description: 'Classic designs that transcend trends',
    image: productBracelet,
  },
  {
    id: 'heritage',
    name: 'Heritage',
    description: 'Inspired by royal Indian craftsmanship',
    image: productBangles,
  },
  {
    id: 'celestial',
    name: 'Celestial',
    description: 'Ethereal pieces inspired by the cosmos',
    image: productPendant,
  },
];

export const categories = [
  'Rings',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Bangles',
  'Pendants',
];

/**
 * @param currencyCode — from Medusa variant price (e.g. EUR). Defaults to INR for static catalogue.
 */
export function formatPrice(price: number, currencyCode: string = 'INR'): string {
  const code = currencyCode.length === 3 ? currencyCode.toUpperCase() : 'INR';
  const fraction = code === 'JPY' || code === 'KRW' || code === 'VND' ? 0 : 2;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: fraction,
    minimumFractionDigits: 0,
  }).format(price);
}
