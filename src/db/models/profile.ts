/**
 * Profile model – extended user data linked to auth.users.
 * One row per user. Created by handle_new_user trigger on signup.
 * RLS: users can only read/update their own profile.
 */
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** References auth.users(id). One-to-one with Supabase Auth user. */
  userId: uuid('user_id').notNull().unique(),
  /** Display name (from signup, OAuth, or profile edit). */
  fullName: text('full_name'),
  /** E.164 phone (from phone OTP signup or profile edit). */
  phone: text('phone'),
  /** Shipping or general address. */
  address: text('address'),
  /** Profile image URL (from OAuth or upload). */
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
