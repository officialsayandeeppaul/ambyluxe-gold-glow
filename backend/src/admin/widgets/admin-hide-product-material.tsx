import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useEffect } from "react";

const STYLE_ID = "amby-admin-india-polish";
const LABELS_MATERIAL = new Set(["Material", "Matériau", "Materialien", "Materiale"]);
const LABELS_HS = new Set([
  "HS code",
  "HS Code",
  "HS-Code",
  "Código HS",
  "Code SH",
]);
const LABELS_MID = new Set([
  "MID code",
  "MID Code",
  "MID-Code",
  "Código MID",
]);

function normalizeComplianceLabel(text: string): string {
  return text.replace(/\s*\(Optional\)\s*$/i, "").trim();
}

/** Hide HS/MID everywhere (product + variant dialogs). Codes still exist in DB for compliance workflows. */
function hideHsMidRowsEverywhere() {
  const rows = document.querySelectorAll(
    ".text-ui-fg-subtle.grid.w-full.grid-cols-2.items-center.gap-4.px-6.py-4",
  );
  rows.forEach((row) => {
    const label = row.firstElementChild;
    const text = label?.textContent?.trim() ?? "";
    const norm = normalizeComplianceLabel(text);
    const isHs = LABELS_HS.has(text) || LABELS_HS.has(norm);
    const isMid = LABELS_MID.has(text) || LABELS_MID.has(norm);
    if (!isHs && !isMid) return;
    (row as HTMLElement).style.display = "none";
  });
}

/** Remove legacy compliance banner if present. */
function removeLegacyComplianceBanner() {
  document.getElementById("amby-variant-compliance-banner")?.remove();
}

function injectPolishStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* Product create/edit: hide core Product.material field group */
    div:has(> label + div input[name="material"]),
    div:has(> label + div > input[name="material"]) {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function hideMaterialSectionRows() {
  const rows = document.querySelectorAll(
    ".text-ui-fg-subtle.grid.w-full.grid-cols-2.items-center.gap-4.px-6.py-4",
  );
  rows.forEach((row) => {
    const label = row.firstElementChild;
    const text = label?.textContent?.trim() ?? "";
    if (LABELS_MATERIAL.has(text)) {
      (row as HTMLElement).style.display = "none";
    }
  });
}

function hideMaterialFormFields() {
  document.querySelectorAll<HTMLInputElement>('input[name="material"]').forEach((input) => {
    let node: HTMLElement | null = input;
    for (let depth = 0; depth < 10 && node; depth++) {
      node = node.parentElement;
      if (!node) break;
      const hasLabel = node.querySelector("label,[data-slot=label]");
      if (hasLabel && node.contains(input)) {
        node.style.display = "none";
        break;
      }
    }
  });
}

/** Mark description as required in the UI (API middleware enforces on save). */
function polishDescriptionField() {
  document.querySelectorAll<HTMLTextAreaElement>('textarea[name="description"]').forEach((ta) => {
    ta.setAttribute("required", "true");
    ta.setAttribute("aria-required", "true");
    let node: HTMLElement | null = ta;
    for (let depth = 0; depth < 10 && node; depth++) {
      node = node.parentElement;
      if (!node) break;
      const lbl = node.querySelector("label,[data-slot=label]");
      if (lbl && node.contains(ta) && !lbl.querySelector("[data-amby-req-star]")) {
        const star = document.createElement("span");
        star.setAttribute("data-amby-req-star", "true");
        star.className = "text-ui-fg-error ml-0.5";
        star.textContent = "*";
        lbl.appendChild(star);
        break;
      }
    }
  });
}

let raf = 0;
function schedulePolish() {
  if (typeof window === "undefined") return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    hideHsMidRowsEverywhere();
    hideMaterialSectionRows();
    hideMaterialFormFields();
    removeLegacyComplianceBanner();
    polishDescriptionField();
  });
}

/**
 * Admin polish: hide Product.material, hide HS/MID in UI (storefront shows physical attrs only),
 * mark description required.
 */
const AdminIndiaPolish = () => {
  useEffect(() => {
    injectPolishStyles();
    schedulePolish();
    const obs = new MutationObserver(() => schedulePolish());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
};

export const config = defineWidgetConfig({
  zone: [
    "login.after",
    "login.before",
    "product.list.before",
    "product.list.after",
    "product.details.before",
    "product.details.after",
    "product_variant.details.before",
    "product_variant.details.after",
    "order.list.before",
    "profile.details.before",
    "customer.list.before",
    "region.list.before",
    "store.details.before",
    "sales_channel.list.before",
    "inventory_item.list.before",
    "inventory_item.details.before",
    "inventory_item.details.after",
  ],
});

export default AdminIndiaPolish;
