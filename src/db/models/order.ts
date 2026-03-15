/**
 * Order model – placed orders per user.
 * items: array of { productId, quantity, price, ... }. totalAmount in smallest currency unit.
 * RLS: users see/create own orders; admins can view/update all.
 */
import { pgTable, uuid, text, jsonb, bigint, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** References auth.users(id). */
  userId: uuid('user_id').notNull(),
  /** Line items JSON. Shape: { productId, quantity, price, name?, ... }[]. */
  items: jsonb('items').notNull().default([]),
  /** Total in smallest unit (e.g. paise/cents). */
  totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
  /** e.g. 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'. */
  status: text('status').notNull().default('pending'),
  /** Shipping address JSON. */
  shippingAddress: jsonb('shipping_address'),
  /** Payment gateway reference. */
  paymentId: text('payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
