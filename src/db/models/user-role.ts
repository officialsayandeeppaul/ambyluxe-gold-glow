/**
 * User role model – assigns roles (admin, customer) to users.
 * One user can have multiple rows (e.g. admin + customer). Unique on (user_id, role).
 * RLS: users see own roles; admins can manage all.
 */
import { pgTable, uuid, unique } from 'drizzle-orm/pg-core';
import { appRoleEnum } from './enums';

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** References auth.users(id). */
    userId: uuid('user_id').notNull(),
    /** Role type. Default 'customer' is set on signup. */
    role: appRoleEnum('role').notNull().default('customer'),
  },
  (t) => [unique('user_roles_user_id_role_unique').on(t.userId, t.role)]
);
