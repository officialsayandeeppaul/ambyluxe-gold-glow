# Admin Customizations

You can extend the Medusa Admin to add widgets and new pages.

> Learn more: [Admin extensions](https://docs.medusajs.com/learn/fundamentals/admin).

## Amby Luxe — storefront metadata (fixed keys)

`widgets/product-storefront-metadata.tsx` injects at **`product.details.before`**. It includes **MRP (₹)** for strikethrough pricing, three **trust** lines with **icon dropdowns** (truck / shield / rotate-ccw), and inline success/error messages (no browser alerts). Metadata key `compare_at_price` still powers MRP on the storefront.