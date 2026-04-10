import type { MedusaRequest } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type { ICustomerModuleService } from "@medusajs/types";

export async function resolveNotificationTargetFromStoreAuth(req: MedusaRequest): Promise<{
  customer_id?: string;
  email?: string;
} | null> {
  const actorId = (
    req as MedusaRequest & { auth_context?: { actor_id?: string } }
  ).auth_context?.actor_id?.trim();
  if (!actorId) return null;

  let email: string | undefined;
  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService;
    const customer = await customerModule.retrieveCustomer(actorId);
    const e = customer?.email?.trim().toLowerCase();
    email = e || undefined;
  } catch {
    // Email fallback is optional; actor_id is enough for primary matching.
  }

  return { customer_id: actorId, email };
}
