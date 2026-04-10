import Medusa from "@medusajs/js-sdk";

/**
 * Admin dashboard runs on the same origin as the API; `baseUrl: "/"` resolves to the Medusa server.
 * @see https://docs.medusajs.com/learn/fundamentals/admin/tips
 */
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
});
