

# Premium Design Overhaul: Collections vs Shop Differentiation

## Problem
The `/collections` and `/shop` routes both render the exact same `Shop` component. They need completely distinct identities. Additionally, the overall design needs to feel more luxurious and refined.

## Strategy

The **Collections page** will be an immersive, editorial experience -- cinematic, story-driven, with large imagery and minimal UI chrome. The **Shop page** remains a functional product browsing grid but gets refined polish. The **Marquee section** gets elevated with richer typography and styling.

---

## Changes

### 1. New Dedicated Collections Page (`src/pages/Collections.tsx`)

A completely new page with a distinct editorial/magazine layout:

- **Full-bleed hero** with a large background image, overlay text with the Cormorant Garamond serif font, and a cinematic dark gradient
- **Three collection showcases** displayed as large immersive sections:
  - Each collection gets a full-width or split-screen panel
  - Large editorial imagery (aspect-ratio 16:9 or wider)
  - Overlaid collection name in dramatic oversized typography
  - Subtle parallax scroll effects on images
  - "Explore Collection" CTA with arrow animation
- **Visual identity**: Spacious, lots of whitespace, large type, feels like flipping through a luxury magazine
- No filters, no grid, no sort -- purely a curated browsing experience

### 2. Shop Page Refinements (`src/pages/Shop.tsx`)

- Refine the hero section to be more compact and functional (less editorial, more utilitarian)
- Improve the filter bar styling with better spacing and a more polished select dropdown
- Add a subtle animated gradient line separator between hero and products
- Polish the overall spacing and visual rhythm

### 3. Marquee / Magic Box Enhancement (`src/components/home/MarqueeSection.tsx`)

- Add a second row scrolling in the opposite direction for a richer visual effect
- Use Cormorant Garamond italic for the text to make it feel more distinguished
- Add a subtle pulsing gold glow behind the center
- Increase vertical padding and add decorative corner accents
- Use a more ornate separator (small gold diamond ornament between items)

### 4. Typography & CSS Refinements (`src/index.css`)

- Add Cormorant Garamond as a third font option for special display moments
- Refine the `text-gold-gradient` with smoother color stops
- Add new utility class `.text-editorial` for oversized editorial headings
- Improve letter-spacing and line-height fine-tuning

### 5. Route Update (`src/App.tsx`)

- Change line 30 from `element={<Shop />}` to `element={<Collections />}` pointing to the new dedicated Collections page

---

## Technical Details

### New file: `src/pages/Collections.tsx`
- Imports: `motion`, `useScroll`, `useTransform` from framer-motion, `Link` from react-router-dom, `Layout`, collection images
- Uses the `collections` data from `src/lib/products.ts`
- Three full-width collection sections with alternating layouts
- Parallax image movement on scroll
- Staggered text reveal animations

### Modified files:
- `src/App.tsx` -- import and route the new Collections page
- `src/pages/Shop.tsx` -- minor spacing/typography refinements
- `src/components/home/MarqueeSection.tsx` -- dual-row marquee, richer ornaments, better typography
- `src/index.css` -- new utility classes and refined design tokens

### No database or backend changes required.

