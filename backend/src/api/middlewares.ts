import { defineMiddlewares } from "@medusajs/framework/http";
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  extractProductDescription,
  isNonEmptyDescription,
} from "./lib/product-description-validation";

const AMBY_MSG =
  "Description is required for Amby Luxe (India storefront). Add a short product description and save again.";

async function requireProductDescriptionOnCreate(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  if (req.method !== "POST") {
    return next();
  }
  const { present, value } = extractProductDescription(req.body);
  if (!present || !isNonEmptyDescription(value)) {
    return res.status(400).json({
      message: AMBY_MSG,
      type: "invalid_data",
    });
  }
  return next();
}

async function rejectEmptyDescriptionOnUpdate(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  if (req.method !== "PATCH") {
    return next();
  }
  const { present, value } = extractProductDescription(req.body);
  if (present && !isNonEmptyDescription(value)) {
    return res.status(400).json({
      message: AMBY_MSG,
      type: "invalid_data",
    });
  }
  return next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: /^\/admin\/products$/,
      methods: ["POST"],
      middlewares: [requireProductDescriptionOnCreate],
    },
    {
      matcher: /^\/admin\/products\/[^/]+$/,
      methods: ["PATCH"],
      middlewares: [rejectEmptyDescriptionOnUpdate],
    },
  ],
});
