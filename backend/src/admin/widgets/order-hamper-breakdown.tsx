import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { DetailWidgetProps } from "@medusajs/framework/types";
import { Container, Heading, Text } from "@medusajs/ui";
import { useMemo } from "react";

type HamperBreakdownRow = {
  slot_label?: string;
  product_name?: string;
  /** Missing on older orders (only selections stored). */
  unit_minor?: number;
};

type OrderLineLike = {
  id?: string;
  title?: string | null;
  variant_sku?: string | null;
  unit_price?: number | null;
  metadata?: Record<string, unknown> | null;
};

type OrderPageData = {
  currency_code?: string | null;
  items?: OrderLineLike[] | null;
};

function readMetaRecord(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  return m as Record<string, unknown>;
}

function parseBreakdown(meta: Record<string, unknown> | null): HamperBreakdownRow[] | null {
  if (!meta) return null;
  const raw = meta.hamper_breakdown;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: HamperBreakdownRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const slot_label = typeof r.slot_label === "string" ? r.slot_label : "";
    const product_name = typeof r.product_name === "string" ? r.product_name : "";
    const unit_minor =
      typeof r.unit_minor === "number" && Number.isFinite(r.unit_minor) ? r.unit_minor : 0;
    if (!slot_label && !product_name) continue;
    out.push({ slot_label, product_name, unit_minor });
  }
  return out.length ? out : null;
}

/** Legacy lines: `hamper_selections` only — no per-slot amounts. */
function parseSelectionsFallback(meta: Record<string, unknown> | null): HamperBreakdownRow[] | null {
  if (!meta) return null;
  const hs = meta.hamper_selections;
  if (!hs || typeof hs !== "object" || Array.isArray(hs)) return null;
  const out: HamperBreakdownRow[] = [];
  for (const [slotId, v] of Object.entries(hs as Record<string, unknown>)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const sel = v as Record<string, unknown>;
    const productName = typeof sel.productName === "string" ? sel.productName : "";
    const label =
      typeof sel.variantLabel === "string" && sel.variantLabel.trim()
        ? `${productName || "Item"} (${sel.variantLabel})`
        : productName || "—";
    out.push({
      slot_label: slotId.replace(/_/g, " "),
      product_name: label,
    });
  }
  return out.length ? out : null;
}

function isHamperLine(meta: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  const hb = meta.hamper_bundle;
  const hs = meta.hamper_selections;
  const bundleFlag = hb === true || hb === "true";
  const hasSelections =
    hs && typeof hs === "object" && !Array.isArray(hs) && Object.keys(hs as object).length > 0;
  return bundleFlag || Boolean(hasSelections);
}

function formatMinor(amountMinor: number, currencyCode: string): string {
  const c = (currencyCode || "inr").toUpperCase();
  const major = c === "JPY" || c === "KRW" ? amountMinor : amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: c.length === 3 ? c : "INR",
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${c}`;
  }
}

type OrderWidgetProps = DetailWidgetProps<OrderPageData> & { order?: OrderPageData };

const OrderHamperBreakdownWidget = (props: OrderWidgetProps) => {
  const data = props.data ?? props.order;
  const blocks = useMemo(() => {
    const items = data?.items ?? [];
    const orderCc = data?.currency_code ?? "inr";
    const out: {
      key: string;
      title: string;
      sku?: string | null;
      baseMinor?: number;
      lineCc: string;
      rows: HamperBreakdownRow[];
      giftMessage?: string;
      hasAmounts: boolean;
    }[] = [];

    for (const li of items) {
      const meta = readMetaRecord(li.metadata ?? undefined);
      if (!isHamperLine(meta)) continue;
      const priced = parseBreakdown(meta);
      const rows = priced ?? parseSelectionsFallback(meta);
      if (!rows) continue;
      const hasAmounts = Boolean(priced);
      const lineCc =
        typeof meta?.hamper_currency === "string" && meta.hamper_currency.trim()
          ? meta.hamper_currency.trim()
          : orderCc;
      const baseRaw = meta?.hamper_base_unit_minor;
      const baseMinor =
        hasAmounts && typeof baseRaw === "number" && Number.isFinite(baseRaw) ? baseRaw : undefined;
      const gm = meta?.gift_message;
      const giftMessage = typeof gm === "string" && gm.trim() ? gm.trim() : undefined;
      out.push({
        key: li.id ?? `${li.title}-${li.variant_sku}`,
        title: li.title?.trim() || "Hamper line",
        sku: li.variant_sku,
        baseMinor,
        lineCc,
        rows,
        giftMessage,
        hasAmounts,
      });
    }
    return out;
  }, [data]);

  if (!blocks.length) return null;

  return (
    <Container className="divide-y divide-dashed p-0 overflow-hidden">
      <div className="px-6 py-4">
        <Heading level="h2">Gift hamper breakdown</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Per-section charges are stored on the line when checkout sync runs with the fixed custom-line
          API. Older orders may list sections without amounts until you rely on the line total only.
        </Text>
      </div>
      {blocks.map((b) => (
        <div key={b.key} className="px-6 py-4 space-y-3">
          <div>
            <Text weight="plus" className="text-ui-fg-base">
              {b.title}
            </Text>
            {b.sku ? (
              <Text size="small" className="text-ui-fg-subtle">
                SKU {b.sku}
              </Text>
            ) : null}
          </div>
          {b.baseMinor != null ? (
            <div className="flex justify-between text-sm">
              <span className="text-ui-fg-subtle">Base product (variant price)</span>
              <span className="font-medium tabular-nums">{formatMinor(b.baseMinor, b.lineCc)}</span>
            </div>
          ) : null}
          {!b.hasAmounts ? (
            <Text size="small" className="text-ui-fg-subtle">
              No per-section amounts on this line — place a new order after updating the storefront sync
              to see priced breakdowns.
            </Text>
          ) : null}
          <div className="rounded-lg border border-ui-border-base overflow-hidden">
            <div
              className={`grid gap-2 px-3 py-2 bg-ui-bg-subtle text-xs font-medium text-ui-fg-subtle uppercase tracking-wide ${b.hasAmounts ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_1fr]"}`}
            >
              <span>Section</span>
              <span>Selection</span>
              {b.hasAmounts ? <span className="text-right">Charge</span> : null}
            </div>
            {b.rows.map((r, i) => (
              <div
                key={`${b.key}-r-${i}`}
                className={`grid gap-2 px-3 py-2 border-t border-ui-border-base text-sm ${b.hasAmounts ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-[1fr_1fr]"}`}
              >
                <span className="text-ui-fg-base">{r.slot_label || "—"}</span>
                <span className="text-ui-fg-subtle">{r.product_name || "—"}</span>
                {b.hasAmounts ? (
                  <span className="text-right tabular-nums font-medium">
                    {formatMinor(r.unit_minor ?? 0, b.lineCc)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {b.giftMessage ? (
            <div className="rounded-md bg-ui-bg-subtle px-3 py-2 text-sm">
              <span className="text-ui-fg-subtle">Gift note: </span>
              <span className="text-ui-fg-base whitespace-pre-wrap">{b.giftMessage}</span>
            </div>
          ) : null}
        </div>
      ))}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.details.after",
});

export default OrderHamperBreakdownWidget;
