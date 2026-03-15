/**
 * Cart model – shopping cart items per user.
 * One row per user + product; quantity can be > 1.
 * RLS: users manage only their own cart.
 */
import { pgTable, uuid, text, integer, timestamp, unique } from 'drizzle-orm/pg-core';

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** References auth.users(id). */
    userId: uuid('user_id').notNull(),
    /** Product identifier. */
    productId: text('product_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('carts_user_id_product_id_unique').on(t.userId, t.productId)]
);
