import { useMemo, useEffect, useState } from 'react';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Product } from '@/lib/store';
import type { HamperBundleConfig, HamperSelectionMap } from '@/lib/hamper';
import { fetchMedusaProductById } from '@/lib/medusa/products';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/products';
import {
  hamperSelectionsComplete,
  hamperSlotSelectionCharge,
  hamperSlotSelectionDiscountPercent,
} from '@/lib/hamper';

type Props = {
  bundle: HamperBundleConfig;
  /** Catalogue + on-demand fetched component products */
  productById: Map<string, Product>;
  value: HamperSelectionMap;
  onChange: (next: HamperSelectionMap) => void;
  giftMessage: string;
  onGiftMessageChange: (v: string) => void;
  /** When true (e.g. inside a drawer), omit the outer card chrome and intro blurb */
  embedded?: boolean;
};

export function HamperConfigurator({
  bundle,
  productById,
  value,
  onChange,
  giftMessage,
  onGiftMessageChange,
  embedded = false,
}: Props) {
  const [resolved, setResolved] = useState<Map<string, Product>>(() => new Map(productById));
  /** When true, slot shows full picker; when false, one shallow summary row (unless required & empty → always open). */
  const [slotDrawerOpen, setSlotDrawerOpen] = useState<Record<string, boolean>>({});

  const missingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of bundle.slots) {
      for (const pid of slot.productIds) {
        if (pid.startsWith('prod_') && !resolved.has(pid)) ids.add(pid);
      }
    }
    return [...ids];
  }, [bundle.slots, resolved]);

  useEffect(() => {
    if (!isMedusaConfigured() || missingIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const next = new Map(resolved);
      for (const id of missingIds) {
        try {
          const p = await fetchMedusaProductById(id);
          if (p && !cancelled) next.set(id, p);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [missingIds.join(',')]);

  useEffect(() => {
    setResolved((prev) => {
      const next = new Map(prev);
      for (const [k, v] of productById) {
        next.set(k, v);
      }
      return next;
    });
  }, [productById]);

  useEffect(() => {
    setSlotDrawerOpen({});
  }, [bundle.slots.map((s) => s.id).join('|')]);

  const pickVariant = (slotId: string, sourceKey: string, product: Product, variantId: string) => {
    const v = product.variants?.find((x) => x.id === variantId) ?? product.variants?.[0];
    const chosen = value[slotId];
    if (chosen?.productId === product.id && chosen?.variantId === variantId) {
      const next = { ...value };
      delete next[slotId];
      onChange(next);
      return;
    }
    onChange({
      ...value,
      [slotId]: {
        productId: product.id,
        variantId,
        productName: product.name,
        variantLabel: v?.title ?? product.variantTitle ?? null,
        sourceKey,
      },
    });
  };

  const toggleSectionOnly = (slotId: string, slotLabel: string) => {
    const chosen = value[slotId];
    if (chosen?.productId === '__section__') {
      const next = { ...value };
      delete next[slotId];
      onChange(next);
      return;
    }
    onChange({
      ...value,
      [slotId]: {
        productId: '__section__',
        variantId: '__section__',
        productName: `${slotLabel} (section only)`,
        variantLabel: null,
        sourceKey: '__section__',
      },
    });
  };

  const maxLen = bundle.giftMessageMaxLength ?? 500;

  const slotSummaryLine = (slotId: string, sectionPrice?: number) => {
    const sel = value[slotId];
    if (!sel) return null;
    if (sel.productId === '__section__') {
      const p = sectionPrice && sectionPrice > 0 ? ` · ${formatPrice(sectionPrice)}` : '';
      return `Section only${p}`;
    }
    return [sel.productName, sel.variantLabel].filter(Boolean).join(' · ') || 'Selected';
  };

  const slotIsExpanded = (slot: (typeof bundle.slots)[0]) => {
    const has = Boolean(value[slot.id]);
    if (slot.required && !has) return true;
    return slotDrawerOpen[slot.id] ?? false;
  };

  const setSlotExpanded = (slotId: string, next: boolean, slot: (typeof bundle.slots)[0]) => {
    const has = Boolean(value[slotId]);
    if (slot.required && !has && !next) return;
    setSlotDrawerOpen((prev) => ({ ...prev, [slotId]: next }));
  };

  const rootClass = embedded
    ? 'space-y-6'
    : 'mb-8 rounded-xl border border-border/50 bg-muted/10 p-4 md:p-5 space-y-6';

  return (
    <div className={rootClass}>
      {!embedded ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <h3 className="text-sm uppercase tracking-wider font-semibold mb-1">Build your hamper</h3>
          <p className="text-sm text-muted-foreground">
            Select optional add-ons for this gift hamper. You can keep any section unselected.
          </p>
        </div>
      ) : null}

      {bundle.slots.map((slot) => {
        const expanded = slotIsExpanded(slot);
        const hasSel = Boolean(value[slot.id]);
        const summary = slotSummaryLine(slot.id, slot.label, slot.sectionPrice);
        const showSectionOnly =
          (!slot.required || slot.productIds.length === 0) && (slot.sectionPrice ?? 0) > 0;

        const shallowHint = !hasSel
          ? slot.required
            ? 'Required — expand to choose'
            : 'Optional — expand to add, or skip'
          : summary;

        return (
          <div
            key={slot.id}
            className={cn(
              'rounded-lg border border-border/50 bg-background/40 overflow-hidden transition-shadow',
              expanded ? 'p-3 space-y-3' : 'p-0',
            )}
          >
            {!expanded ? (
              <button
                type="button"
                onClick={() => setSlotExpanded(slot.id, true, slot)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/25 transition-colors"
              >
                {slot.image ? (
                  <img
                    src={slot.image}
                    alt=""
                    className="h-10 w-10 rounded-md border border-border/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md border border-dashed border-border/40 bg-muted/15 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{slot.label}</span>
                    <span
                      className={cn(
                        'text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border',
                        slot.required
                          ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                          : 'border-border/60 text-muted-foreground',
                      )}
                    >
                      {slot.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{shallowHint}</p>
                </div>
                {showSectionOnly ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSectionOnly(slot.id, slot.label);
                    }}
                    className={cn(
                      'shrink-0 text-[9px] uppercase tracking-wide px-2 py-1.5 rounded border',
                      value[slot.id]?.productId === '__section__'
                        ? 'border-primary bg-primary/10'
                        : 'border-border/60 hover:border-primary/50',
                    )}
                  >
                    {value[slot.id]?.productId === '__section__' ? 'Section on' : 'Section only'}
                  </button>
                ) : null}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  {!(slot.required && !hasSel) ? (
                    <button
                      type="button"
                      onClick={() => setSlotExpanded(slot.id, false, slot)}
                      className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" aria-hidden />
                      Collapse
                    </button>
                  ) : null}
                </div>
                {showSectionOnly ? (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => toggleSectionOnly(slot.id, slot.label)}
                      className={cn(
                        'text-[10px] uppercase tracking-wide px-2.5 py-1.5 rounded border',
                        value[slot.id]?.productId === '__section__'
                          ? 'border-primary bg-primary/10'
                          : 'border-border/60 hover:border-primary/50',
                      )}
                    >
                      {value[slot.id]?.productId === '__section__'
                        ? 'Section selected'
                        : 'Select section only'}
                    </button>
                  </div>
                ) : null}
                <div className="flex items-start gap-3">
                  {slot.image ? (
                    <img
                      src={slot.image}
                      alt={slot.label}
                      className="h-16 w-16 rounded-md border border-border/50 object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md border border-dashed border-border/50 bg-muted/20 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-medium text-foreground">{slot.label}</h4>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded border',
                          slot.required
                            ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                            : 'border-border/60 text-muted-foreground',
                        )}
                      >
                        {slot.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    {slot.description ? (
                      <p className="text-sm text-muted-foreground mt-0.5">{slot.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      Price is based on chosen product and discount %.
                      {slot.sectionPrice && slot.sectionPrice > 0
                        ? ` Section price ${formatPrice(slot.sectionPrice)} is added on selection.`
                        : ''}
                    </p>
                  </div>
                </div>
                {slot.productIds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/50 p-3 text-xs text-muted-foreground">
                    No products in this section yet.
                    {showSectionOnly
                      ? ' Use “Section only” above to include the section price without a product.'
                      : ' You can still continue.'}
                  </div>
                ) : null}
                {slot.productIds.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slot.productIds.map((pid) => {
                      const p = resolved.get(pid);
                      if (!p?.variantId) {
                        return (
                          <div
                            key={pid}
                            className="rounded-lg border border-dashed border-border/50 p-4 text-xs text-muted-foreground"
                          >
                            Loading…
                          </div>
                        );
                      }
                      const variants = p.variants?.length ? p.variants : [];
                      const defaultVid = variants[0]?.id ?? p.variantId;
                      const chosen = value[slot.id];
                      const discountPct = hamperSlotSelectionDiscountPercent(slot, {
                        productId: p.id,
                        sourceKey: pid,
                      });
                      const choiceCharge = hamperSlotSelectionCharge(
                        slot,
                        {
                          productId: p.id,
                          sourceKey: pid,
                        },
                        p.price,
                      );
                      if (!defaultVid) {
                        return (
                          <div
                            key={pid}
                            className="rounded-lg border border-destructive/30 p-3 text-xs text-destructive"
                          >
                            No variant — fix product in Admin.
                          </div>
                        );
                      }
                      return (
                        <div
                          key={pid}
                          className={cn(
                            'rounded-lg border bg-muted/20 overflow-hidden transition-colors',
                            chosen?.productId === p.id
                              ? 'border-primary ring-1 ring-primary/30'
                              : 'border-border/50',
                          )}
                        >
                          <div className="aspect-square bg-background-elevated">
                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-xs font-medium line-clamp-2 leading-snug">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {choiceCharge > 0
                                ? `${formatPrice(choiceCharge)}${discountPct > 0 ? ` (${discountPct}% off)` : ''}`
                                : 'Included in hamper'}
                            </p>
                            {variants.length > 1 ? (
                              <div className="flex flex-wrap gap-1">
                                {variants.map((vv) => (
                                  <button
                                    key={vv.id}
                                    type="button"
                                    onClick={() => pickVariant(slot.id, pid, p, vv.id)}
                                    className={cn(
                                      'text-[10px] px-2 py-1 rounded border transition-colors',
                                      chosen?.variantId === vv.id
                                        ? 'border-primary bg-primary/15'
                                        : 'border-border/60 hover:border-primary/40',
                                    )}
                                  >
                                    {vv.title || 'Option'}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => pickVariant(slot.id, pid, p, defaultVid)}
                                className={cn(
                                  'w-full text-[10px] uppercase tracking-wide py-2 rounded border',
                                  chosen?.productId === p.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border/60 hover:border-primary/50',
                                )}
                              >
                                {chosen?.productId === p.id ? (
                                  <span className="inline-flex items-center justify-center gap-1">
                                    <Check className="w-3 h-3" /> Selected
                                  </span>
                                ) : (
                                  'Choose'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}

      {bundle.allowGiftMessage ? (
        <div className="space-y-2">
          <Label htmlFor="gift-msg">Gift note (optional)</Label>
          <Textarea
            id="gift-msg"
            value={giftMessage}
            onChange={(e) =>
              onGiftMessageChange(e.target.value.slice(0, maxLen))
            }
            placeholder="Printed on the card — keep it short and sweet."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {giftMessage.length}/{maxLen} characters
          </p>
        </div>
      ) : null}

      {!bundle.slots.some((s) => s.required) ? (
        <p className="text-xs text-muted-foreground">
          All sections are optional. Choose only what you want.
        </p>
      ) : null}
      {!hamperSelectionsComplete(bundle, value) ? (
        <p className="text-xs text-amber-600 dark:text-amber-400/90">
          Choose one product in every required section.
        </p>
      ) : null}
    </div>
  );
}
