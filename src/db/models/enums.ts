/**
 * Shared enums for the database.
 * Used by user_roles and any role-based checks.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

/** Application roles: admin (full access), customer (default) */
export const appRoleEnum = pgEnum('app_role', ['admin', 'customer']);
