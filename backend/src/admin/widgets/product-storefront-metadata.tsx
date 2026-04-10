import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sdk } from "../lib/sdk";

/** Keep in sync with `TRUST_BADGE_ICON_IDS` in storefront `src/lib/store.ts`. */
const TRUST_ICON_OPTIONS: { value: string; hint: string }[] = [
  { value: "truck", hint: "Delivery / shipping" },
  { value: "shield", hint: "Warranty / protection" },
  { value: "rotate-ccw", hint: "Returns / exchange" },
  { value: "gift", hint: "Gift / offer" },
  { value: "heart", hint: "Love / favourite" },
  { value: "award", hint: "Award / quality" },
  { value: "gem", hint: "Gem / premium" },
  { value: "sparkles", hint: "Sparkle / new" },
  { value: "package", hint: "Packaging / box" },
  { value: "badge-check", hint: "Verified / certified" },
  { value: "ribbon", hint: "Ribbon / prize" },
  { value: "clock", hint: "Time / dispatch" },
  { value: "map-pin", hint: "Location / store" },
  { value: "star", hint: "Star / rating" },
  { value: "medal", hint: "Medal / excellence" },
];

const TRUST_ICON_ID_SET = new Set(TRUST_ICON_OPTIONS.map((o) => o.value));
const HAMPER_IMAGE_ACCEPT = "image/*";
const HAMPER_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

type TrustIconId = (typeof TRUST_ICON_OPTIONS)[number]["value"];

type BadgeRow = { label: string; icon: TrustIconId };

const EMPTY_BADGES: [BadgeRow, BadgeRow, BadgeRow] = [
  { label: "", icon: "truck" },
  { label: "", icon: "shield" },
  { label: "", icon: "rotate-ccw" },
];

function readBool(m: Record<string, unknown> | undefined, key: string): boolean {
  const v = m?.[key];
  return v === true || v === "true" || v === "1";
}

function readString(m: Record<string, unknown> | undefined, key: string): string {
  const v = m?.[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

function parseIcon(raw: unknown): TrustIconId {
  if (typeof raw === "string" && TRUST_ICON_ID_SET.has(raw)) return raw as TrustIconId;
  return "truck";
}

function parseTrustRows(m: Record<string, unknown>): [BadgeRow, BadgeRow, BadgeRow] {
  const out: [BadgeRow, BadgeRow, BadgeRow] = [
    { ...EMPTY_BADGES[0] },
    { ...EMPTY_BADGES[1] },
    { ...EMPTY_BADGES[2] },
  ];
  const raw = m.trust_badges;
  let arr: unknown[] = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) arr = j;
    } catch {
      return out;
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  }
  for (let i = 0; i < 3; i++) {
    const item = arr[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    out[i] = { label, icon: parseIcon(o.icon) };
  }
  return out;
}

function rowsToTrustJson(rows: [BadgeRow, BadgeRow, BadgeRow]): string {
  const built = rows
    .map((r) => ({ label: r.label.trim(), icon: r.icon }))
    .filter((r) => r.label.length > 0);
  return built.length ? JSON.stringify(built) : "";
}

function parseOptionalBool(raw: unknown): boolean | undefined {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;
  if (raw === false || raw === "false" || raw === 0 || raw === "0") return false;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "yes" || v === "on") return true;
    if (v === "no" || v === "off") return false;
  }
  return undefined;
}

/** One hamper section — matches storefront `hamper_bundle.slots[]` after save. */
type HamperSlotFormRow = {
  reactKey: string;
  slotId: string;
  label: string;
  description: string;
  required: boolean;
  sectionPrice: string;
  image: string;
  /** Products the shopper can choose for this section */
  picks: { id: string; title: string; discountPercent: string }[];
};

function newHamperSlotRow(): HamperSlotFormRow {
  return {
    reactKey: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    slotId: "",
    label: "",
    description: "",
    required: true,
    sectionPrice: "",
    image: "",
    picks: [],
  };
}

function parseHamperBundleToForm(m: Record<string, unknown>): {
  slots: HamperSlotFormRow[];
  allowGiftMessage: boolean;
  giftMessageMaxLength: string;
} {
  const raw = m.hamper_bundle;
  let obj: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return { slots: [], allowGiftMessage: false, giftMessageMaxLength: "240" };
    }
  }
  if (!obj || typeof obj !== "object") {
    return { slots: [], allowGiftMessage: false, giftMessageMaxLength: "240" };
  }
  const o = obj as Record<string, unknown>;
  const slotsRaw = o.slots;
  const slots: HamperSlotFormRow[] = [];
  if (Array.isArray(slotsRaw)) {
    for (const row of slotsRaw) {
      if (!row || typeof row !== "object") continue;
      const s = row as Record<string, unknown>;
      const id = typeof s.id === "string" ? s.id.trim() : "";
      const label = typeof s.label === "string" ? s.label.trim() : "";
      if (!id || !label) continue;
      let ids: string[] = [];
      const pid = s.product_ids ?? s.productIds ?? s.product_handles ?? s.productHandles;
      if (Array.isArray(pid)) {
        ids = pid.map((x) => String(x).trim()).filter(Boolean);
      } else if (typeof pid === "string" && pid.trim()) {
        ids = pid
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
      }
      slots.push({
        reactKey: `loaded-${id}-${Math.random().toString(36).slice(2, 8)}`,
        slotId: id,
        label,
        description: typeof s.description === "string" ? s.description : "",
        required: parseOptionalBool(s.required ?? s.is_required) ?? false,
        sectionPrice:
          typeof s.section_price === "number"
            ? String(Math.max(0, s.section_price))
            : typeof s.sectionPrice === "number"
              ? String(Math.max(0, s.sectionPrice))
              : "",
        image: typeof s.image === "string" ? s.image : "",
        picks: ids.map((productId) => ({
          id: productId,
          title: "",
          discountPercent: (() => {
            const map = (s.product_discount_percents ?? s.productDiscountPercents) as Record<string, unknown> | undefined;
            if (!map || typeof map !== "object") return "";
            const v = map[productId];
            if (typeof v === "number" && Number.isFinite(v) && v >= 0) return String(Math.min(100, Math.max(0, v)));
            if (typeof v === "string" && v.trim() && Number.isFinite(Number(v)) && Number(v) >= 0) {
              return String(Math.min(100, Math.max(0, Number(v))));
            }
            return "";
          })(),
        })),
      });
    }
  }
  const allowGiftMessage =
    o.allow_gift_message === true ||
    o.allow_gift_message === "true" ||
    o.allowGiftMessage === true ||
    o.allowGiftMessage === "true";
  const gmax = o.gift_message_max_length ?? o.giftMessageMaxLength;
  let giftMessageMaxLength = "240";
  if (typeof gmax === "number" && gmax > 0) {
    giftMessageMaxLength = String(Math.min(2000, gmax));
  } else if (typeof gmax === "string" && /^\d+$/.test(gmax)) {
    giftMessageMaxLength = String(Math.min(2000, parseInt(gmax, 10)));
  }
  return { slots, allowGiftMessage, giftMessageMaxLength };
}

function buildHamperBundleFromForm(
  slots: HamperSlotFormRow[],
  allowGiftMessage: boolean,
  giftMessageMaxLengthStr: string,
): Record<string, unknown> | null {
  const cleaned = slots
    .map((s) => {
      const productDiscountEntries = s.picks
        .map((p) => [p.id, p.discountPercent.trim() ? Math.min(100, Math.max(0, Number(p.discountPercent))) : NaN] as const)
        .filter(([, n]) => Number.isFinite(n) && n >= 0);
      return {
        id: s.slotId.trim(),
        label: s.label.trim(),
        description: s.description.trim() || undefined,
        required: Boolean(s.required),
        is_required: Boolean(s.required),
        section_price:
          s.sectionPrice.trim() && Number.isFinite(Number(s.sectionPrice))
            ? Math.max(0, Number(s.sectionPrice))
            : undefined,
        image: s.image.trim() || undefined,
        product_discount_percents: productDiscountEntries.length
          ? Object.fromEntries(productDiscountEntries)
          : undefined,
        product_ids: s.picks.map((p) => p.id).filter(Boolean),
      };
    })
    .filter((s) => s.id && s.label);
  if (!cleaned.length) return null;
  const out: Record<string, unknown> = { slots: cleaned };
  if (allowGiftMessage) {
    out.allow_gift_message = true;
    const n = parseInt(giftMessageMaxLengthStr, 10);
    out.gift_message_max_length =
      Number.isFinite(n) && n > 0 ? Math.min(2000, n) : 500;
  }
  return out;
}

function validateHamperForm(slots: HamperSlotFormRow[]): string | null {
  const seen = new Set<string>();
  for (const s of slots) {
    const id = s.slotId.trim();
    if (!id) continue;
    if (seen.has(id)) {
      return `Section key "${id}" is used twice. Each section needs a unique key (e.g. box, ribbon, card).`;
    }
    seen.add(id);
  }
  for (const s of slots) {
    const id = s.slotId.trim();
    const label = s.label.trim();
    if (!id && !label && s.picks.length === 0 && !s.description.trim() && !s.image.trim() && !s.sectionPrice.trim()) continue;
    if (!id) return "Each hamper section needs an internal key (e.g. keepsake_box).";
    if (!label) return `Section "${id}" needs a title shoppers will see.`;
  }
  return null;
}

/** Load product titles for chips (ids loaded from saved metadata). */
function useHydrateHamperPickTitles(
  slots: HamperSlotFormRow[],
  setSlots: Dispatch<SetStateAction<HamperSlotFormRow[]>>,
) {
  const pendingKey = useMemo(() => {
    const parts: string[] = [];
    for (const s of slots) {
      for (const p of s.picks) {
        if (!p.title.trim()) parts.push(`${s.reactKey}\t${p.id}`);
      }
    }
    return parts.sort().join("|");
  }, [slots]);

  useEffect(() => {
    if (!pendingKey) return;
    const pairs = pendingKey
      .split("|")
      .map((part) => {
        const i = part.indexOf("\t");
        if (i < 0) return null;
        return { slotKey: part.slice(0, i), id: part.slice(i + 1) };
      })
      .filter((x): x is { slotKey: string; id: string } => Boolean(x?.slotKey && x?.id));
    if (pairs.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const { slotKey, id } of pairs.slice(0, 25)) {
        if (cancelled) return;
        if (!id.startsWith("prod_")) {
          setSlots((prev) =>
            prev.map((row) =>
              row.reactKey !== slotKey
                ? row
                : {
                    ...row,
                    picks: row.picks.map((x) => (x.id === id ? { ...x, title: x.title || id } : x)),
                  },
            ),
          );
          continue;
        }
        try {
          const res = (await sdk.admin.product.retrieve(id, {
            fields: "id,title",
          })) as { product?: { title?: string } };
          const title = res.product?.title?.trim() || id;
          if (cancelled) return;
          setSlots((prev) =>
            prev.map((row) =>
              row.reactKey !== slotKey
                ? row
                : {
                    ...row,
                    picks: row.picks.map((x) => (x.id === id ? { ...x, title } : x)),
                  },
            ),
          );
        } catch {
          if (!cancelled) {
            setSlots((prev) =>
              prev.map((row) =>
                row.reactKey !== slotKey
                  ? row
                  : {
                      ...row,
                      picks: row.picks.map((x) => (x.id === id ? { ...x, title: id } : x)),
                    },
              ),
            );
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingKey, setSlots]);
}

function HamperProductSearch({
  query,
  onQueryChange,
  excludeIds,
  onPick,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  excludeIds: Set<string>;
  onPick: (p: { id: string; title: string }) => void;
}) {
  const [debounced, setDebounced] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["sf-hamper-product-search", debounced],
    queryFn: async () => {
      const res = (await sdk.admin.product.list({
        q: debounced,
        limit: 18,
        fields: "id,title,handle",
      })) as { products?: { id: string; title: string }[] };
      return res.products ?? [];
    },
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const { data: recentData, isFetching: recentLoading } = useQuery({
    queryKey: ["sf-hamper-product-recent"],
    queryFn: async () => {
      const res = (await sdk.admin.product.list({
        limit: 20,
        fields: "id,title,handle",
      })) as { products?: { id: string; title: string }[] };
      return res.products ?? [];
    },
    enabled: showRecent,
    staleTime: 120_000,
  });

  const list = (data ?? []).filter((p) => !excludeIds.has(p.id));
  const recentList = (recentData ?? []).filter((p) => !excludeIds.has(p.id));

  const pick = (p: { id: string; title: string }) => {
    onPick({ id: p.id, title: p.title || p.id });
    onQueryChange("");
  };

  return (
    <div className="space-y-2 min-w-0">
      <Label className="text-ui-fg-subtle">Add a product (search by name)</Label>
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Type at least 2 letters…"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="transparent"
          size="small"
          className="text-ui-fg-muted"
          onClick={() => setShowRecent((v) => !v)}
        >
          {showRecent ? "Hide" : "Show"} recent products
        </Button>
      </div>
      {showRecent ? (
        <div className="rounded-md border border-ui-border-base bg-ui-bg-field max-h-40 overflow-y-auto">
          {recentLoading ? (
            <Text size="small" className="p-3 text-ui-fg-muted">
              Loading…
            </Text>
          ) : recentList.length === 0 ? (
            <Text size="small" className="p-3 text-ui-fg-muted">
              No products to show, or all are already added / excluded.
            </Text>
          ) : (
            <ul className="py-1">
              {recentList.map((p) => (
                <li key={p.id} className="border-b border-ui-border-base last:border-0">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-ui-bg-subtle-hover transition-colors"
                    onClick={() => pick(p)}
                  >
                    <span className="text-ui-fg-base font-medium line-clamp-1">{p.title || p.id}</span>
                    <span className="block font-mono text-[11px] text-ui-fg-muted mt-0.5">{p.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {debounced.length >= 2 ? (
        <div className="rounded-md border border-ui-border-base bg-ui-bg-field max-h-48 overflow-y-auto">
          {isFetching ? (
            <Text size="small" className="p-3 text-ui-fg-muted">
              Searching…
            </Text>
          ) : list.length === 0 ? (
            <Text size="small" className="p-3 text-ui-fg-muted">
              No products found. Try another word, or use recent products above.
            </Text>
          ) : (
            <ul className="py-1">
              {list.map((p) => (
                <li key={p.id} className="border-b border-ui-border-base last:border-0">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-ui-bg-subtle-hover transition-colors"
                    onClick={() => pick(p)}
                  >
                    <span className="text-ui-fg-base font-medium line-clamp-1">{p.title || p.id}</span>
                    <span className="block font-mono text-[11px] text-ui-fg-muted mt-0.5">{p.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Text size="small" className="text-ui-fg-muted">
          Search results appear after you type 2+ letters, or open recent products.
        </Text>
      )}
    </div>
  );
}

function SaveModal({
  open,
  ok,
  message,
  onClose,
}: {
  open: boolean;
  ok: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sf-save-modal-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-ui-border-strong bg-ui-bg-base shadow-elevation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-ui-border-base">
          <Heading id="sf-save-modal-title" level="h2">
            {ok ? "Saved" : "Could not save"}
          </Heading>
        </div>
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle leading-relaxed">
            {message}
          </Text>
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-ui-border-base">
          <Button type="button" variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const ProductStorefrontMetadataWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const qc = useQueryClient();

  const [tagline, setTagline] = useState("");
  const [details, setDetails] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState("");
  const [mrpRupees, setMrpRupees] = useState("");
  const [badges, setBadges] = useState<[BadgeRow, BadgeRow, BadgeRow]>(EMPTY_BADGES);
  const [onlyInHamper, setOnlyInHamper] = useState(false);
  const [hamperSlots, setHamperSlots] = useState<HamperSlotFormRow[]>([]);
  const [hamperAllowGiftMessage, setHamperAllowGiftMessage] = useState(false);
  const [hamperGiftMessageMaxLength, setHamperGiftMessageMaxLength] = useState("240");
  const [hamperShowJsonPreview, setHamperShowJsonPreview] = useState(false);
  const [hamperSearchBySlot, setHamperSearchBySlot] = useState<Record<string, string>>({});
  const [hamperUploadHintBySlot, setHamperUploadHintBySlot] = useState<Record<string, string>>({});
  const slotImageUploadForRef = useRef<string | null>(null);

  const [saveModal, setSaveModal] = useState<{ ok: boolean; message: string } | null>(null);

  useHydrateHamperPickTitles(hamperSlots, setHamperSlots);

  useEffect(() => {
    const m = (product.metadata ?? {}) as Record<string, unknown>;
    setTagline(readString(m, "tagline"));
    const rawDetails = m.details;
    if (Array.isArray(rawDetails)) {
      setDetails(rawDetails.map(String).join("\n"));
    } else {
      setDetails(readString(m, "details"));
    }
    setIsNew(readBool(m, "is_new"));
    setIsBestseller(readBool(m, "is_bestseller"));
    setFeatured(readBool(m, "featured"));
    setFeaturedOrder(readString(m, "featured_order"));
    setMrpRupees(readString(m, "compare_at_price"));
    setBadges(parseTrustRows(m));
    setOnlyInHamper(readBool(m, "only_in_hamper"));
    const parsedHamper = parseHamperBundleToForm(m);
    setHamperSlots(parsedHamper.slots);
    setHamperAllowGiftMessage(parsedHamper.allowGiftMessage);
    setHamperGiftMessageMaxLength(parsedHamper.giftMessageMaxLength);
    setHamperSearchBySlot({});
    setHamperUploadHintBySlot({});
    setHamperShowJsonPreview(false);
  }, [product.id, product.metadata]);

  const hamperJsonPreview = useMemo(() => {
    const built = buildHamperBundleFromForm(
      hamperSlots,
      hamperAllowGiftMessage,
      hamperGiftMessageMaxLength,
    );
    return built ? JSON.stringify(built, null, 2) : "";
  }, [hamperSlots, hamperAllowGiftMessage, hamperGiftMessageMaxLength]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const hamperErr = validateHamperForm(hamperSlots);
      if (hamperErr) {
        throw new Error(hamperErr);
      }

      const trustJson = rowsToTrustJson(badges);
      const patch: Record<string, string> = {
        tagline: tagline.trim(),
        details: details.trim(),
        is_new: isNew ? "true" : "false",
        is_bestseller: isBestseller ? "true" : "false",
        featured: featured ? "true" : "false",
        featured_order: featuredOrder.trim() || "999",
        compare_at_price: mrpRupees.trim(),
        trust_badges: trustJson,
      };

      const merged: Record<string, unknown> = {
        ...(product.metadata as Record<string, unknown> | undefined),
      };
      delete merged.materials;
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" && k !== "is_new" && k !== "is_bestseller" && k !== "featured") {
          delete merged[k];
          continue;
        }
        if ((k === "compare_at_price" || k === "trust_badges" || k === "details") && v === "") {
          delete merged[k];
          continue;
        }
        merged[k] = v;
      }

      if (onlyInHamper) {
        merged.only_in_hamper = "true";
      } else {
        delete merged.only_in_hamper;
      }

      const hamperPayload = buildHamperBundleFromForm(
        hamperSlots,
        hamperAllowGiftMessage,
        hamperGiftMessageMaxLength,
      );
      if (hamperPayload) {
        merged.hamper_bundle = JSON.stringify(hamperPayload);
      } else {
        delete merged.hamper_bundle;
      }

      return sdk.admin.product.update(product.id, { metadata: merged });
    },
    onSuccess: () => {
      void qc.invalidateQueries();
      setSaveModal({
        ok: true,
        message:
          "Your website fields are saved. Refresh the storefront to see changes immediately.",
      });
    },
    onError: (e: Error) => {
      setSaveModal({
        ok: false,
        message: e?.message || "Something went wrong. Try again.",
      });
    },
  });

  const { mutateAsync: uploadSlotImage, isPending: isUploadingSlotImage } = useMutation({
    mutationFn: async ({
      slotKey,
      file,
    }: {
      slotKey: string;
      file: File;
    }) => {
      if (file.size > HAMPER_IMAGE_MAX_BYTES) {
        throw new Error(
          `Image must be ${Math.floor(HAMPER_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller.`,
        );
      }
      const { files } = await sdk.admin.upload.create({ files: [file] });
      const url = files?.[0]?.url;
      if (!url || typeof url !== "string") {
        throw new Error("Upload finished but no file URL was returned.");
      }
      return { slotKey, url };
    },
    onSuccess: ({ slotKey, url }) => {
      setHamperSlots((prev) =>
        prev.map((r) => (r.reactKey === slotKey ? { ...r, image: url } : r)),
      );
      setHamperUploadHintBySlot((prev) => ({ ...prev, [slotKey]: "" }));
      slotImageUploadForRef.current = null;
    },
    onError: (e: Error) => {
      const slotKey = slotImageUploadForRef.current;
      if (!slotKey) return;
      setHamperUploadHintBySlot((prev) => ({
        ...prev,
        [slotKey]: e?.message || "Upload failed.",
      }));
      slotImageUploadForRef.current = null;
    },
  });

  const setBadge = (index: 0 | 1 | 2, partial: Partial<BadgeRow>) => {
    setBadges((prev) => {
      const next: [BadgeRow, BadgeRow, BadgeRow] = [...prev] as [BadgeRow, BadgeRow, BadgeRow];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  };

  return (
    <Container className="divide-y divide-dashed p-0 mb-6 border border-ui-border-strong rounded-lg overflow-hidden bg-ui-bg-subtle/30">
      <SaveModal
        open={saveModal != null}
        ok={saveModal?.ok ?? true}
        message={saveModal?.message ?? ""}
        onClose={() => setSaveModal(null)}
      />

      <div className="px-6 py-4 space-y-1">
        <Heading level="h2">Amby Luxe — website fields</Heading>
        <Text size="small" className="text-ui-fg-muted max-w-4xl">
          Fixed fields for the storefront — toggles and icon dropdowns; no metadata keys to type. The
          public URL slug uses Medusa’s <span className="text-ui-fg-base">Handle</span> in the product
          form below (e.g. <span className="font-mono text-ui-fg-subtle">/products/your-handle</span>).
        </Text>
      </div>

      <div className="px-6 py-4 w-full grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8 lg:items-start">
          <div className="space-y-2 min-w-0">
            <Label>Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Timeless"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label>Details (one line per bullet)</Label>
            <Textarea
              rows={5}
              className="min-h-[7.5rem]"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={"One bullet per line"}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Switch id="sf-is-new" checked={isNew} onCheckedChange={setIsNew} />
            <Label htmlFor="sf-is-new">NEW badge</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sf-bestseller" checked={isBestseller} onCheckedChange={setIsBestseller} />
            <Label htmlFor="sf-bestseller">Bestseller</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sf-featured" checked={featured} onCheckedChange={setFeatured} />
            <Label htmlFor="sf-featured">Featured (Curated)</Label>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Curated order</Label>
            <Input
              type="number"
              value={featuredOrder}
              onChange={(e) => setFeaturedOrder(e.target.value)}
              placeholder="1"
            />
            <Text size="small" className="text-ui-fg-muted">
              Lower number = earlier on homepage and product page strips.
            </Text>
          </div>
          <div className="space-y-2">
            <Label>MRP (₹) — strikethrough “was” price</Label>
            <Input
              value={mrpRupees}
              onChange={(e) => setMrpRupees(e.target.value)}
              placeholder="e.g. 320000"
            />
            <Text size="small" className="text-ui-fg-muted">
              Indian MRP in rupees (digits only, no ₹). Shown crossed out when the selling price is
              lower. Leave empty if there is no MRP to show.
            </Text>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-dashed border-ui-border-base">
          <div className="flex items-center gap-2">
            <Switch id="sf-only-hamper" checked={onlyInHamper} onCheckedChange={setOnlyInHamper} />
            <Label htmlFor="sf-only-hamper">Hamper add-on only (hide from shop — sold inside bundles)</Label>
          </div>

          <div>
            <Label className="text-base">Gift hamper (this product)</Label>
            <Text size="small" className="text-ui-fg-muted mt-1 block max-w-4xl">
              Use this on the <span className="text-ui-fg-base">main hamper product</span>. Add one or more
              sections; shoppers choose one product per section on the site. Search by product name — no
              need to copy IDs. Leave all sections empty for a normal product.
            </Text>
          </div>

          {hamperSlots.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted block">
              No sections yet. Click &quot;Add hamper section&quot; to create the first step (e.g. box, card,
              ribbon).
            </Text>
          ) : null}

          <div className="space-y-6">
            {hamperSlots.map((row, index) => (
              <div
                key={row.reactKey}
                className="rounded-lg border border-ui-border-base bg-ui-bg-field p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Heading level="h3" className="text-base font-medium">
                    Section {index + 1}
                  </Heading>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      setHamperSlots((prev) => prev.filter((r) => r.reactKey !== row.reactKey))
                    }
                  >
                    Remove section
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 min-w-0">
                    <Label className="text-ui-fg-subtle">Internal key</Label>
                    <Input
                      value={row.slotId}
                      onChange={(e) =>
                        setHamperSlots((prev) =>
                          prev.map((r) =>
                            r.reactKey === row.reactKey ? { ...r, slotId: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="e.g. keepsake_box"
                    />
                    <Text size="small" className="text-ui-fg-muted">
                      Short id, no spaces. Shoppers do not see this.
                    </Text>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label className="text-ui-fg-subtle">Title shoppers see</Label>
                    <Input
                      value={row.label}
                      onChange={(e) =>
                        setHamperSlots((prev) =>
                          prev.map((r) =>
                            r.reactKey === row.reactKey ? { ...r, label: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="e.g. Keepsake box"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`sf-hamper-required-${row.reactKey}`}
                    checked={row.required}
                    onCheckedChange={(v) =>
                      setHamperSlots((prev) =>
                        prev.map((r) =>
                          r.reactKey === row.reactKey ? { ...r, required: Boolean(v) } : r,
                        ),
                      )
                    }
                  />
                  <Label htmlFor={`sf-hamper-required-${row.reactKey}`}>
                    Shopper must choose one product in this section
                  </Label>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-ui-fg-subtle">Section fixed price (optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={row.sectionPrice}
                    onChange={(e) =>
                      setHamperSlots((prev) =>
                        prev.map((r) =>
                          r.reactKey === row.reactKey ? { ...r, sectionPrice: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="e.g. 300"
                  />
                  <Text size="small" className="text-ui-fg-muted">
                    Added once when shopper selects any product in this section.
                  </Text>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-ui-fg-subtle">Short description (optional)</Label>
                  <Textarea
                    rows={2}
                    value={row.description}
                    onChange={(e) =>
                      setHamperSlots((prev) =>
                        prev.map((r) =>
                          r.reactKey === row.reactKey ? { ...r, description: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="e.g. Pick a finish"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-ui-fg-subtle">Section image URL (optional)</Label>
                  <Text size="small" className="text-ui-fg-muted">
                    Upload from your computer (recommended) or paste a URL manually.
                  </Text>
                  <input
                    type="file"
                    accept={HAMPER_IMAGE_ACCEPT}
                    className="hidden"
                    id={`sf-slot-image-upload-${row.reactKey}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        setHamperUploadHintBySlot((prev) => ({
                          ...prev,
                          [row.reactKey]: "Please choose an image file.",
                        }));
                        return;
                      }
                      slotImageUploadForRef.current = row.reactKey;
                      void uploadSlotImage({ slotKey: row.reactKey, file }).catch(() => undefined);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      disabled={isPending || isUploadingSlotImage}
                      onClick={() =>
                        document.getElementById(`sf-slot-image-upload-${row.reactKey}`)?.click()
                      }
                    >
                      {isUploadingSlotImage && slotImageUploadForRef.current === row.reactKey
                        ? "Uploading…"
                        : "Upload image"}
                    </Button>
                    {row.image.trim() ? (
                      <Button
                        type="button"
                        variant="transparent"
                        size="small"
                        disabled={isPending}
                        onClick={() =>
                          setHamperSlots((prev) =>
                            prev.map((r) =>
                              r.reactKey === row.reactKey ? { ...r, image: "" } : r,
                            ),
                          )
                        }
                      >
                        Clear image
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    value={row.image}
                    onChange={(e) =>
                      setHamperSlots((prev) =>
                        prev.map((r) =>
                          r.reactKey === row.reactKey ? { ...r, image: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="https://.../keepbox.jpg"
                  />
                  {hamperUploadHintBySlot[row.reactKey] ? (
                    <Text size="small" className="text-red-600">
                      {hamperUploadHintBySlot[row.reactKey]}
                    </Text>
                  ) : null}
                  <Text size="small" className="text-ui-fg-muted">
                    Shown in storefront above this section title.
                  </Text>
                  {row.image.trim() ? (
                    <img
                      src={
                        /^https?:\/\//i.test(row.image)
                          ? row.image
                          : `${(import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/$/, "")}${
                              row.image.startsWith("/") ? row.image : `/${row.image}`
                            }`
                      }
                      alt={`${row.label || row.slotId || "Hamper section"} preview`}
                      className="max-h-24 w-auto rounded border border-ui-border-base object-contain"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-ui-fg-subtle">Products shoppers can pick</Label>
                  <div className="space-y-2 min-h-[2rem]">
                    {row.picks.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_9rem_auto] gap-2 items-center rounded-md border border-ui-border-strong bg-ui-bg-base px-2.5 py-2 text-xs max-w-full"
                      >
                        <span className="truncate max-w-[20rem]">{p.title.trim() || p.id}</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          value={p.discountPercent}
                          onChange={(e) =>
                            setHamperSlots((prev) =>
                              prev.map((r) =>
                                r.reactKey === row.reactKey
                                  ? {
                                      ...r,
                                      picks: r.picks.map((x) =>
                                        x.id === p.id ? { ...x, discountPercent: e.target.value } : x,
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          placeholder="Discount %"
                        />
                        <button
                          type="button"
                          className="text-ui-fg-muted hover:text-ui-fg-error shrink-0 leading-none px-0.5"
                          aria-label={`Remove ${p.id}`}
                          onClick={() =>
                            setHamperSlots((prev) =>
                              prev.map((r) =>
                                r.reactKey === row.reactKey
                                  ? { ...r, picks: r.picks.filter((x) => x.id !== p.id) }
                                  : r,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <Text size="small" className="text-ui-fg-muted">
                    Set discount % per product choice. Price is auto-fetched from product and discounted.
                  </Text>
                  <HamperProductSearch
                    query={hamperSearchBySlot[row.reactKey] ?? ""}
                    onQueryChange={(q) =>
                      setHamperSearchBySlot((prev) => ({ ...prev, [row.reactKey]: q }))
                    }
                    excludeIds={new Set([...row.picks.map((p) => p.id)])}
                    onPick={(p) => {
                      setHamperSlots((prev) =>
                        prev.map((r) => {
                          if (r.reactKey !== row.reactKey) return r;
                          if (r.picks.some((x) => x.id === p.id)) return r;
                          return { ...r, picks: [...r.picks, { ...p, discountPercent: "" }] };
                        }),
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setHamperSlots((prev) => [...prev, newHamperSlotRow()])}
            >
              Add hamper section
            </Button>
            {hamperSlots.length > 0 ? (
              <Button
                type="button"
                variant="transparent"
                className="text-ui-fg-muted"
                onClick={() => {
                  setHamperSlots([]);
                  setHamperSearchBySlot({});
                  setHamperAllowGiftMessage(false);
                  setHamperGiftMessageMaxLength("240");
                }}
              >
                Clear all hamper sections
              </Button>
            ) : null}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-dashed border-ui-border-base">
            <div className="flex items-center gap-2">
              <Switch
                id="sf-hamper-gift-msg"
                checked={hamperAllowGiftMessage}
                onCheckedChange={setHamperAllowGiftMessage}
              />
              <Label htmlFor="sf-hamper-gift-msg">Allow gift note on the website</Label>
            </div>
            {hamperAllowGiftMessage ? (
              <div className="space-y-2">
                <Label className="text-ui-fg-subtle">Max characters for gift note</Label>
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  value={hamperGiftMessageMaxLength}
                  onChange={(e) => setHamperGiftMessageMaxLength(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="pt-1">
            <button
              type="button"
              className="text-xs text-ui-fg-muted underline-offset-2 hover:underline"
              onClick={() => setHamperShowJsonPreview((v) => !v)}
            >
              {hamperShowJsonPreview ? "Hide" : "Show"} technical JSON preview
            </button>
            {hamperShowJsonPreview ? (
              <Textarea
                className="font-mono text-xs mt-2 min-h-[8rem]"
                readOnly
                rows={10}
                value={
                  hamperJsonPreview ||
                  "(Nothing will be saved — add sections and products, or remove all sections.)"
                }
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-dashed border-ui-border-base">
          <div>
            <Label className="text-base">Trust row (up to 3)</Label>
            <Text size="small" className="text-ui-fg-muted mt-1 block">
              Pick an icon and type the label. Empty rows are skipped on the site.
            </Text>
          </div>
          {([0, 1, 2] as const).map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 min-w-0"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <Label className="text-ui-fg-subtle">Line {i + 1} — text</Label>
                <Input
                  value={badges[i].label}
                  onChange={(e) => setBadge(i, { label: e.target.value })}
                  placeholder={
                    i === 0
                      ? "e.g. Free Shipping"
                      : i === 1
                        ? "e.g. Lifetime Warranty"
                        : "e.g. 30-Day Returns"
                  }
                />
              </div>
              <div className="space-y-2 w-full md:w-[min(100%,20rem)] md:flex-shrink-0 min-w-0">
                <Label className="text-ui-fg-subtle">Icon</Label>
                <Select
                  value={badges[i].icon}
                  onValueChange={(v) => setBadge(i, { icon: v as TrustIconId })}
                >
                  <Select.Trigger aria-label={`Trust badge ${i + 1} icon`}>
                    <Select.Value placeholder="Choose icon" />
                  </Select.Trigger>
                  <Select.Content position="popper" sideOffset={6}>
                    {TRUST_ICON_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.value} — {opt.hint}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 flex justify-end bg-ui-bg-base border-t border-ui-border-base">
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => void mutateAsync()}
        >
          {isPending ? "Saving…" : "Save website fields"}
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.before",
});

export default ProductStorefrontMetadataWidget;
