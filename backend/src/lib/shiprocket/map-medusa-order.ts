import type {
  OrderAddressDTO,
  OrderDTO,
  OrderLineItemDTO,
} from "@medusajs/types";
import { medusaAmountToMajor, roundRupees } from "./money";

export type ShiprocketEnvDims = {
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  weightKg: number;
};

function envNumber(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function shiprocketPackageFromEnv(): ShiprocketEnvDims {
  return {
    lengthCm: Math.max(0.5, envNumber("SHIPROCKET_PACKAGE_LENGTH_CM", 10)),
    breadthCm: Math.max(0.5, envNumber("SHIPROCKET_PACKAGE_BREADTH_CM", 10)),
    heightCm: Math.max(0.5, envNumber("SHIPROCKET_PACKAGE_HEIGHT_CM", 10)),
    weightKg: Math.max(0.01, envNumber("SHIPROCKET_PACKAGE_WEIGHT_KG", 0.5)),
  };
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v) || 0;
  if (v && typeof v === "object" && "numeric_" in (v as object)) {
    return Number((v as { numeric_: string }).numeric_) || 0;
  }
  return Number(v) || 0;
}

function digitsPhone(phone: string | undefined, fallback: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length >= 10) {
    if (d.length > 10 && d.startsWith("91")) return d.slice(-10);
    return d.slice(-10);
  }
  return (fallback.replace(/\D/g, "") || "9999999999").slice(0, 10);
}

function countryLabel(code: string | undefined): string {
  const c = (code || "in").toUpperCase();
  if (c === "IN") return "India";
  return c;
}

function districtFromMetadata(a?: OrderAddressDTO): string {
  if (!a?.metadata || typeof a.metadata !== "object") return "";
  const d = (a.metadata as Record<string, unknown>).district;
  return typeof d === "string" ? d.trim() : "";
}

/**
 * One “complete address” string similar to Shiprocket’s manual textarea — reduces “junk address”
 * scoring when line1 was only a short street/ward. Structured city/state/pin are still sent separately.
 */
function formatShiprocketAddressLine1(a?: OrderAddressDTO): string {
  if (!a) return "Address not provided";
  const street = [a.address_1, a.company].filter(Boolean).join(", ").trim();
  const city = (a.city || "").trim();
  const state = (a.province || "").trim();
  const pin = String(a.postal_code || "").replace(/\D/g, "");
  const district = districtFromMetadata(a);

  const streetLower = street.toLowerCase();
  const has = (frag: string) =>
    frag.length > 0 && streetLower.includes(frag.toLowerCase());

  const chunks: string[] = [];
  if (street) chunks.push(street);
  if (district && !has(district)) chunks.push(district);
  if (city && !has(city)) chunks.push(city);

  const pinStateCountry = [pin, state, "India"].filter(Boolean).join(" ");
  if (pin && !street.includes(pin)) chunks.push(pinStateCountry);
  else if (state && !has(state)) chunks.push(state);

  let line = chunks.join(", ").replace(/,\s*,/g, ", ").trim();
  line = line.replace(/\s+/g, " ").trim();
  if (line.length < 12) {
    const fb = [street, district, city, pin, state, "India"].filter(Boolean).join(", ");
    if (fb.trim().length > line.length) line = fb.trim();
  }
  return line.slice(0, 190) || "—";
}

/** Line1 = full mailing-style line; line2 = landmark / flat only (Shiprocket order form shape). */
function shiprocketAddrLines(a?: OrderAddressDTO): { line1: string; line2: string } {
  if (!a) return { line1: "Address not provided", line2: "" };
  const line1 = formatShiprocketAddressLine1(a);
  const line2 = (a.address_2 || "").trim().slice(0, 190);
  return { line1, line2 };
}

function addressSignature(a?: OrderAddressDTO): string {
  if (!a) return "";
  return [
    a.first_name,
    a.last_name,
    a.address_1,
    a.address_2,
    a.city,
    a.postal_code,
    a.province,
    a.country_code,
    a.phone,
  ]
    .join("|")
    .toLowerCase();
}

export function buildShiprocketOrderId(order: OrderDTO): string {
  const core = order.id.replace(/^order_/, "");
  const tail = core.slice(-12);
  const sid = order.display_id ?? 0;
  const base = `M-${sid}-${tail}`;
  return base.length > 50 ? `M-${sid}-${tail.slice(-(50 - 3 - String(sid).length))}` : base;
}

function paymentMethodForOrder(order: OrderDTO): "Prepaid" | "COD" {
  const forced = process.env.SHIPROCKET_PAYMENT_METHOD?.trim().toUpperCase();
  if (forced === "COD") return "COD";
  if (forced === "PREPAID") return "Prepaid";

  const tx = order.transactions ?? [];
  const paid = tx.some((t) => num(t.amount) > 0);
  if (paid) return "Prepaid";
  /**
   * `order.placed` runs before complete-cart finishes recording Razorpay captures on the order,
   * so transactions are often still empty here. Online checkout is prepaid — default Prepaid.
   * Use SHIPROCKET_PAYMENT_METHOD=COD for true cash-on-delivery flows.
   */
  return "Prepaid";
}

function lineSellingPriceInr(
  line: OrderLineItemDTO,
  currency: string,
): number {
  const qty = Math.max(1, line.quantity || line.detail?.quantity || 1);
  const totalMinor = num(line.total);
  if (totalMinor > 0) {
    const per = medusaAmountToMajor(totalMinor, currency) / qty;
    return Math.max(1, roundRupees(per));
  }
  const up = num(line.unit_price);
  const per = medusaAmountToMajor(up, currency);
  return Math.max(1, roundRupees(per));
}

function lineSku(line: OrderLineItemDTO): string {
  const sku = line.variant_sku?.trim();
  if (sku) return sku.slice(0, 50);
  const pid = line.product_id || "p";
  const vid = line.variant_id || line.id;
  return `SKU-${pid.replace(/\W/g, "").slice(-6)}-${vid.replace(/\W/g, "").slice(-6)}`.slice(
    0,
    50,
  );
}

function lineName(line: OrderLineItemDTO): string {
  const title =
    line.product_title?.trim() ||
    line.title?.trim() ||
    line.variant_title?.trim() ||
    "Item";
  return title.slice(0, 120);
}

export function buildShiprocketAdhocPayload(
  order: OrderDTO,
  pickupLocation: string,
): Record<string, unknown> {
  const currency = order.currency_code || "inr";
  const bill = order.billing_address ?? order.shipping_address;
  const ship = order.shipping_address ?? order.billing_address;

  if (!ship?.postal_code || !ship?.city || !ship?.province) {
    throw new Error(
      "Shiprocket: order is missing shipping address (pincode, city, state).",
    );
  }

  const email = (
    order.email ||
    (bill?.metadata?.email as string | undefined) ||
    process.env.SHIPROCKET_FALLBACK_EMAIL?.trim() ||
    ""
  ).trim();
  if (!email || !email.includes("@")) {
    throw new Error(
      "Shiprocket: order email is missing or invalid. Set checkout email or SHIPROCKET_FALLBACK_EMAIL.",
    );
  }
  const billPhone = digitsPhone(
    bill?.phone,
    ship.phone || process.env.SHIPROCKET_FALLBACK_PHONE || "9999999999",
  );
  const shipPhone = digitsPhone(
    ship.phone,
    bill?.phone || process.env.SHIPROCKET_FALLBACK_PHONE || "9999999999",
  );

  const same =
    addressSignature(order.billing_address) ===
      addressSignature(order.shipping_address) ||
    !order.billing_address ||
    !order.shipping_address;

  const { line1: b1, line2: b2 } = shiprocketAddrLines(bill);
  const { line1: s1, line2: s2 } = shiprocketAddrLines(ship);

  const items = (order.items || []).filter((i) => i.requires_shipping !== false);
  const lines = items.length > 0 ? items : order.items || [];

  if (lines.length === 0) {
    throw new Error("Shiprocket: order has no line items to ship.");
  }

  const orderItems = lines.map((line) => {
    const hsnRaw = line.metadata?.hsn ?? line.metadata?.hsn_code;
    const entry: Record<string, unknown> = {
      name: lineName(line),
      sku: lineSku(line),
      units: Math.max(1, line.quantity || 1),
      selling_price: lineSellingPriceInr(line, currency),
    };
    if (hsnRaw != null && String(hsnRaw).trim() !== "") {
      const hsn = parseInt(String(hsnRaw).replace(/\D/g, ""), 10);
      if (Number.isFinite(hsn)) entry.hsn = hsn;
    }
    return entry;
  });

  const subFromLines = orderItems.reduce(
    (acc, it) => acc + (it.selling_price as number) * (it.units as number),
    0,
  );
  const subMinor = num(order.subtotal);
  const subFromOrder = roundRupees(medusaAmountToMajor(subMinor, currency));
  const subTotal = subFromLines > 0 ? subFromLines : Math.max(1, subFromOrder);

  const shipChargeMinor = (order.shipping_methods || []).reduce(
    (s, m) => s + num(m.total ?? m.amount),
    0,
  );
  const shippingCharges =
    shipChargeMinor > 0 ? roundRupees(medusaAmountToMajor(shipChargeMinor, currency)) : 0;

  const discountMinor = num(order.discount_total);
  const totalDiscount =
    discountMinor > 0 ? roundRupees(medusaAmountToMajor(discountMinor, currency)) : 0;

  const dims = shiprocketPackageFromEnv();
  const paymentMethod = paymentMethodForOrder(order);

  const created =
    order.created_at instanceof Date
      ? order.created_at
      : new Date(order.created_at || Date.now());
  const orderDate =
    `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;

  const channelIdRaw = process.env.SHIPROCKET_CHANNEL_ID?.trim();
  const channelId = channelIdRaw ? parseInt(channelIdRaw, 10) : undefined;

  const shipMethod = order.shipping_methods?.[0];
  const shipMethodName = shipMethod?.name?.trim() || "";
  const shipNameLower = shipMethodName.toLowerCase();
  /** Shiprocket’s UI often stays “incomplete” until this is set — default like their manual orders. */
  let checkoutShippingMethod =
    process.env.SHIPROCKET_CHECKOUT_SHIPPING_METHOD?.trim() || "SR_STANDARD";
  if (shipNameLower.includes("express")) {
    checkoutShippingMethod =
      process.env.SHIPROCKET_SR_METHOD_EXPRESS?.trim() || "SR_EXPRESS";
  } else if (shipNameLower.includes("standard")) {
    checkoutShippingMethod =
      process.env.SHIPROCKET_SR_METHOD_STANDARD?.trim() || "SR_STANDARD";
  }

  const body: Record<string, unknown> = {
    order_id: buildShiprocketOrderId(order),
    order_date: orderDate,
    pickup_location: pickupLocation,
    billing_customer_name: (bill?.first_name || "Customer").slice(0, 100),
    billing_last_name: (bill?.last_name || ".").slice(0, 100),
    billing_address: b1,
    billing_address_2: b2 || undefined,
    billing_city: (bill?.city || ship.city)!.toString().slice(0, 30),
    billing_pincode: parseInt(String(bill?.postal_code || ship.postal_code).replace(/\D/g, ""), 10),
    billing_state: (bill?.province || ship.province)!.toString().slice(0, 100),
    billing_country: countryLabel(bill?.country_code || ship.country_code),
    billing_email: email.slice(0, 120),
    billing_phone: billPhone,
    shipping_is_billing: same ? 1 : 0,
    order_items: orderItems,
    payment_method: paymentMethod,
    sub_total: subTotal,
    length: dims.lengthCm,
    breadth: dims.breadthCm,
    height: dims.heightCm,
    weight: dims.weightKg,
  };

  if (channelId && Number.isFinite(channelId)) body.channel_id = channelId;
  if (shippingCharges > 0) body.shipping_charges = shippingCharges;
  if (totalDiscount > 0) body.total_discount = totalDiscount;
  body.checkout_shipping_method = checkoutShippingMethod;

  const shipDist = districtFromMetadata(ship);
  const billDist = districtFromMetadata(bill);
  const commentParts = [
    shipMethodName && `Shipping: ${shipMethodName}`,
    shipDist && `District: ${shipDist}`,
    billDist && shipDist !== billDist && `Bill district: ${billDist}`,
  ].filter(Boolean) as string[];
  if (commentParts.length > 0) {
    body.comment = commentParts.join(" | ").slice(0, 500);
  }

  if (!same && ship) {
    body.shipping_customer_name = (ship.first_name || "Customer").slice(0, 100);
    body.shipping_last_name = (ship.last_name || ".").slice(0, 100);
    body.shipping_address = s1;
    body.shipping_address_2 = s2 || undefined;
    body.shipping_city = ship.city!.toString().slice(0, 30);
    body.shipping_pincode = parseInt(String(ship.postal_code).replace(/\D/g, ""), 10);
    body.shipping_state = ship.province!.toString().slice(0, 100);
    body.shipping_country = countryLabel(ship.country_code);
    body.shipping_email = email.slice(0, 120);
    body.shipping_phone = shipPhone;
  }

  return body;
}
