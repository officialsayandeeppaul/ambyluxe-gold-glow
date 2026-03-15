/**
 * Schema barrel – re-exports all models.
 * Source of truth lives in src/db/models/ (profile, user-role, wishlist, cart, order).
 * Run: npm run db:generate
 */
export {
  appRoleEnum,
  profiles,
  userRoles,
  wishlists,
  carts,
  orders,
} from './models';
