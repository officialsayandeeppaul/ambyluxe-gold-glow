import type { OrderDTO, OrderLineItemDTO } from "@medusajs/types";
import { medusaAmountToMajor } from "../shiprocket/money";

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v) || 0;
  if (v && typeof v === "object" && "numeric_" in (v as object)) {
    return Number((v as { numeric_: string }).numeric_) || 0;
  }
  return Number(v) || 0;
}

function formatMoney(major: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase() === "INR" ? "INR" : currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

function lineTitle(line: OrderLineItemDTO): string {
  const p = line.product_title ?? line.title ?? line.variant_title;
  if (typeof p === "string" && p.trim()) return p.trim();
  return "Item";
}

export function buildOrderInvoiceEmailHtml(order: OrderDTO): {
  subject: string;
  html: string;
  text: string;
} {
  const currency = (order.currency_code || "inr").toUpperCase();
  const displayId = order.display_id ?? "?";
  const emailSubject = `Order #${displayId} — receipt & summary`;

  const items = order.items ?? [];
  const rows = items
    .map((line) => {
      const qty = Math.max(1, line.quantity ?? line.detail?.quantity ?? 1);
      const lineTotalMinor = num(line.total);
      const major = medusaAmountToMajor(lineTotalMinor, currency);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(lineTitle(line))}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(major, currency)}</td>
      </tr>`;
    })
    .join("");

  const subtotalMinor = num(order.subtotal);
  const shipMinor = num(order.shipping_total);
  const taxMinor = num(order.tax_total);
  const discMinor = num(order.discount_total);
  const totalMinor = num(order.total);

  const addr = order.shipping_address;
  const shipBlock = addr
    ? `<p style="margin:0 0 16px;font-size:14px;color:#444;">
        <strong>Ship to</strong><br/>
        ${escapeHtml([addr.first_name, addr.last_name].filter(Boolean).join(" "))}<br/>
        ${escapeHtml(addr.address_1 || "")}${addr.address_2 ? `, ${escapeHtml(addr.address_2)}` : ""}<br/>
        ${escapeHtml(addr.city || "")}, ${escapeHtml(addr.province || "")} ${escapeHtml(addr.postal_code || "")}<br/>
        ${escapeHtml(addr.country_code?.toUpperCase() || "")}
      </p>`
    : "";

  const storeUrl = (process.env.STORE_PUBLIC_URL || "").replace(/\/$/, "") || "#";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Georgia,'Times New Roman',serif;background:#faf9f7;color:#1a1a1a;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e4df;padding:28px;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#8a7355;">Thank you</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">Your order #${displayId}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#444;">
      We received your payment and are preparing your jewellery. This email is your order summary (not a tax invoice unless your template says otherwise).
    </p>
    ${shipBlock}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <thead><tr>
        <th align="left" style="padding:8px;border-bottom:2px solid #c9a962;">Item</th>
        <th style="padding:8px;border-bottom:2px solid #c9a962;">Qty</th>
        <th align="right" style="padding:8px;border-bottom:2px solid #c9a962;">Line</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="3" style="padding:8px;">No line items</td></tr>`}</tbody>
    </table>
    <table style="width:100%;font-size:14px;color:#333;">
      <tr><td>Subtotal</td><td align="right">${formatMoney(medusaAmountToMajor(subtotalMinor, currency), currency)}</td></tr>
      ${shipMinor > 0 ? `<tr><td>Shipping</td><td align="right">${formatMoney(medusaAmountToMajor(shipMinor, currency), currency)}</td></tr>` : ""}
      ${taxMinor > 0 ? `<tr><td>Tax</td><td align="right">${formatMoney(medusaAmountToMajor(taxMinor, currency), currency)}</td></tr>` : ""}
      ${discMinor > 0 ? `<tr><td>Discount</td><td align="right">−${formatMoney(medusaAmountToMajor(discMinor, currency), currency)}</td></tr>` : ""}
      <tr style="font-weight:700;font-size:16px;"><td style="padding-top:12px;">Total paid</td><td align="right" style="padding-top:12px;">${formatMoney(medusaAmountToMajor(totalMinor, currency), currency)}</td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#666;">
      <a href="${escapeHtml(storeUrl)}" style="color:#8a7355;">Visit the boutique</a>
    </p>
  </div>
</body></html>`;

  const textLines = [
    `Order #${displayId}`,
    "",
    ...items.map((line) => {
      const qty = Math.max(1, line.quantity ?? line.detail?.quantity ?? 1);
      const major = medusaAmountToMajor(num(line.total), currency);
      return `- ${lineTitle(line)} x${qty}  ${formatMoney(major, currency)}`;
    }),
    "",
    `Total: ${formatMoney(medusaAmountToMajor(totalMinor, currency), currency)}`,
    "",
    storeUrl !== "#" ? `Store: ${storeUrl}` : "",
  ];

  return { subject: emailSubject, html, text: textLines.filter(Boolean).join("\n") };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
