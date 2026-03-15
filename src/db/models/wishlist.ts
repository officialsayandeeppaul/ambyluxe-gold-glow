/**
 * Wishlist model – saved products per user.
 * One row per user + product. RLS: users manage only their own wishlist.
 */
import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** References auth.users(id). */
    userId: uuid('user_id').notNull(),
    /** Product identifier (matches app product id). */
    productId: text('product_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('wishlists_user_id_product_id_unique').on(t.userId, t.productId)]
);
