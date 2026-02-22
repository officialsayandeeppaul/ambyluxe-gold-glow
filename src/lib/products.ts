import { Product } from './store';

import productRing from '@/assets/product-ring.jpg';
import productNecklace from '@/assets/product-necklace.jpg';
import productEarrings from '@/assets/product-earrings.jpg';
import productBangles from '@/assets/product-bangles.jpg';
import productPendant from '@/assets/product-pendant.jpg';
import productBracelet from '@/assets/product-bracelet.jpg';
import productSapphireRing from '@/assets/product-sapphire-ring.jpg';
import productChandelierEarrings from '@/assets/product-chandelier-earrings.jpg';

export const products: Product[] = [
  {
    id: '1',
    name: 'Eternal Diamond Solitaire',
    price: 285000,
    originalPrice: 320000,
    image: productRing,
    images: [productRing, productRing, productRing],
    category: 'Rings',
    collection: 'Timeless',
    description: 'A breathtaking solitaire ring featuring a 2-carat brilliant-cut diamond, set in 18k white gold. The epitome of eternal elegance.',
    details: ['2-carat brilliant-cut diamond', '18k white gold setting', 'VS1 clarity, F color', 'GIA certified'],
    materials: '18K White Gold, Natural Diamond',
    isNew: true,
    isBestseller: true,
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
    materials: '22K Gold, Emeralds, Diamonds',
    isBestseller: true,
  },
  {
    id: '3',
    name: 'Celestial Pearl Drops',
    price: 95000,
    originalPrice: 115000,
    image: productEarrings,
    images: [productEarrings, productEarrings],
    category: 'Earrings',
    collection: 'Celestial',
    description: 'Elegant drop earrings featuring lustrous South Sea pearls suspended from diamond-encrusted crescents in 18k yellow gold.',
    details: ['South Sea pearls (12mm)', '18k yellow gold', 'Diamond accents (0.5 ctw)', 'Secure butterfly backs'],
    materials: '18K Yellow Gold, South Sea Pearls, Diamonds',
    isNew: true,
  },
  {
    id: '4',
    name: 'Maharani Bangles Set',
    price: 185000,
    image: productBangles,
    category: 'Bangles',
    collection: 'Heritage',
    description: 'A luxurious set of three hand-crafted bangles featuring traditional Indian artistry with contemporary elegance. Ruby and diamond accents.',
    details: ['Set of 3 bangles', 'Natural rubies', 'Diamond melee', '22k gold'],
    materials: '22K Gold, Rubies, Diamonds',
  },
  {
    id: '5',
    name: 'Aurora Diamond Pendant',
    price: 165000,
    image: productPendant,
    category: 'Pendants',
    collection: 'Celestial',
    description: 'A mesmerizing pendant featuring a 1.5-carat pear-shaped diamond surrounded by a halo of smaller brilliants, evoking the northern lights.',
    details: ['1.5-carat pear diamond', 'Diamond halo setting', '18k white gold', 'Includes 18" chain'],
    materials: '18K White Gold, Diamonds',
    isNew: true,
    isBestseller: true,
  },
  {
    id: '6',
    name: 'Infinity Tennis Bracelet',
    price: 245000,
    image: productBracelet,
    category: 'Bracelets',
    collection: 'Timeless',
    description: 'A classic tennis bracelet reimagined with 5 carats of round brilliant diamonds set in platinum, symbolizing infinite love.',
    details: ['5 carats total weight', 'Round brilliant diamonds', 'Platinum setting', 'Secure box clasp'],
    materials: 'Platinum, Natural Diamonds',
    isBestseller: true,
  },
  {
    id: '7',
    name: 'Sapphire Cocktail Ring',
    price: 195000,
    image: productSapphireRing,
    category: 'Rings',
    collection: 'Heritage',
    description: 'A stunning cocktail ring featuring a 3-carat Ceylon sapphire surrounded by baguette and round diamonds in an art deco setting.',
    details: ['3-carat Ceylon sapphire', 'Baguette & round diamonds', '18k white gold', 'Art deco design'],
    materials: '18K White Gold, Sapphire, Diamonds',
  },
  {
    id: '8',
    name: 'Golden Cascades Earrings',
    price: 125000,
    originalPrice: 145000,
    image: productChandelierEarrings,
    category: 'Earrings',
    collection: 'Timeless',
    description: 'Dramatic chandelier earrings featuring cascading golden leaves adorned with champagne diamonds for an unforgettable statement.',
    details: ['Champagne diamonds', '18k yellow gold', 'Chandelier design', 'Post with omega backs'],
    materials: '18K Yellow Gold, Champagne Diamonds',
    isNew: true,
  },
];

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

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};
