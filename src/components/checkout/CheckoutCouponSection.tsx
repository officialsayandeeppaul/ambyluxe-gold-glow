import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Loader2, Sparkles, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AppliedCouponDisplay, CheckoutPromotionCatalogItem } from '@/lib/medusa/checkoutPromotions';
import { mapCatalogItemToDef, offerCodeForDisplay } from '@/lib/medusa/checkoutPromotions';

type CheckoutCouponSectionProps = {
  appliedCoupons: AppliedCouponDisplay[];
  /** Manual offers from the store — horizontal picker (not already on cart). */
  availableOffers: CheckoutPromotionCatalogItem[];
  currencyLabel: string;
  /** After shopper picks a delivery option — used to explain shipping-target promos. */
  deliveryOptionCommitted?: boolean;
  catalogLoading?: boolean;
  disabled: boolean;
  promoBusy: boolean;
  applyingCode: string | null;
  promoInput: string;
  onPromoInputChange: (value: string) => void;
  onApplyCode: (code: string) => void;
  onApplyManual: () => void;
  onRemoveCode: (code: string) => void;
};

const scrollRow =
  'flex gap-3 overflow-x-auto overflow-y-visible py-1.5 pb-2 snap-x snap-mandatory scroll-smooth -mx-1 px-1 scroll-pl-1 scroll-pr-3 [scrollbar-width:thin] [scrollbar-color:hsla(42,55%,42%,0.45)_transparent]';

const cardShell =
  'flex-none w-[min(17rem,calc(100vw-2.5rem))] sm:w-60 min-w-[13.5rem] max-w-[17rem] snap-start rounded-sm border bg-background/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]';

const appliedCardShell =
  'w-full min-w-0 max-w-full rounded-sm border bg-background/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]';

export function CheckoutCouponSection({
  appliedCoupons,
  availableOffers,
  currencyLabel,
  deliveryOptionCommitted = false,
  catalogLoading = false,
  disabled,
  promoBusy,
  applyingCode,
  promoInput,
  onPromoInputChange,
  onApplyCode,
  onApplyManual,
  onRemoveCode,
}: CheckoutCouponSectionProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const manualAppliedCount = appliedCoupons.filter((c) => !c.isAutomatic).length;
  const autoAppliedCount = appliedCoupons.filter((c) => c.isAutomatic).length;

  return (
    <div className="rounded-sm border border-primary/[0.11] bg-gradient-to-b from-background-elevated/50 to-background/22 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/15 bg-muted/[0.07]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/14 text-primary border border-primary/22 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <Tag className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="flex items-center gap-0.5 min-w-0 flex-nowrap">
            <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-foreground/95 whitespace-nowrap shrink min-w-0 truncate">
              Offers · {currencyLabel}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10"
              aria-expanded={infoOpen}
              aria-controls="checkout-offers-info"
              aria-label={infoOpen ? 'Hide how offers work' : 'How offers work'}
              onClick={() => setInfoOpen((v) => !v)}
            >
              <Info className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {manualAppliedCount > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 tabular-nums px-2.5 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/20">
              {manualAppliedCount} code active
            </span>
          ) : null}
          {autoAppliedCount > 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary tabular-nums px-2.5 py-1 rounded-sm bg-primary/12 border border-primary/20">
              +{autoAppliedCount} auto
            </span>
          ) : null}
        </div>
      </div>

      {infoOpen ? (
        <div
          id="checkout-offers-info"
          className="px-4 py-3 border-b border-border/15 bg-muted/[0.05] space-y-2.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed"
        >
          <p>
            Swipe the rows below — we only list codes that actually save money on your current bag. You
            can use offers before you choose shipping.
          </p>
          <p>
            <span className="text-foreground/90 font-medium">One manual code at a time:</span> applying
            another replaces the previous one. Automatic promotions (for example free or discounted
            delivery) can stay on at the same time when Medusa allows it.
          </p>
        </div>
      ) : null}

      <div className="px-3 sm:px-3.5 py-3.5 space-y-4 min-w-0">
        {/* Applied — horizontal */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 px-0.5">
            On your order
          </p>
          {catalogLoading && appliedCoupons.length === 0 ? (
            <div className="rounded-sm border border-border/20 px-4 py-5 bg-muted/[0.04]">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Updating your bag…
              </p>
            </div>
          ) : appliedCoupons.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border/28 px-4 py-5 bg-muted/[0.04] text-center">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                <span className="text-foreground/90 font-medium">Nothing applied yet.</span> Swipe an offer
                below or type a code — you can do this before choosing shipping.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3" aria-label="Offers applied to this order">
              {appliedCoupons.map((row) => (
                <article
                  key={row.code}
                  className={cn(
                    appliedCardShell,
                    'p-3.5 flex flex-col gap-2.5',
                    row.isAutomatic
                      ? 'border-primary/30 bg-primary/[0.05]'
                      : 'border-emerald-500/35 bg-emerald-500/[0.06]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      {row.isAutomatic ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary px-1.5 py-0.5 rounded-sm border border-primary/35 bg-primary/10">
                          <Sparkles className="h-3 w-3" aria-hidden />
                          Auto
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10">
                          Applied
                        </span>
                      )}
                      <h4 className="text-[12px] sm:text-sm font-medium text-foreground leading-snug line-clamp-2">
                        {row.title}
                      </h4>
                      <span className="inline-flex font-mono text-[10px] text-foreground/85 px-2 py-0.5 rounded-sm bg-background/70 border border-border/35 w-fit">
                        {row.displayCode}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[11px] rounded-sm shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      disabled={disabled || promoBusy || row.isAutomatic}
                      title={
                        row.isAutomatic
                          ? 'Managed automatically with your cart.'
                          : 'Remove this code'
                      }
                      onClick={() => onRemoveCode(row.code)}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                    {row.applicationTarget === 'shipping_methods' && !deliveryOptionCommitted
                      ? 'This offer affects delivery cost. Your summary will show the saving after you choose a delivery speed below.'
                      : row.subtitle}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Pick an offer — horizontal */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 px-0.5">
            For your bag
          </p>
          {catalogLoading && availableOffers.length === 0 ? (
            <div className="rounded-sm border border-border/20 px-3 py-4 bg-muted/[0.04]">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading offers…
              </p>
            </div>
          ) : availableOffers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-0.5 leading-relaxed">
              No other codes match this bag right now — try &quot;Enter a code&quot; if you have one.
            </p>
          ) : (
            <div className={scrollRow} aria-label="Available offer codes">
              {availableOffers.map((item) => {
                const def = mapCatalogItemToDef(item);
                const chip = offerCodeForDisplay(def);
                const key = item.code;
                const applying = applyingCode === item.code.trim().toUpperCase();
                return (
                  <article
                    key={key}
                    className={cn(cardShell, 'p-3.5 flex flex-col gap-3 border-primary/22 bg-primary/[0.04]')}
                  >
                    <div className="min-w-0 space-y-1">
                      {item.badge ? (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary px-1.5 py-0.5 rounded-sm border border-primary/30 bg-primary/10 inline-block w-fit">
                          {item.badge}
                        </span>
                      ) : null}
                      <h4 className="text-[12px] sm:text-sm font-medium text-foreground leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                      <span className="inline-flex font-mono text-[10px] font-semibold text-primary px-2 py-0.5 rounded-sm bg-primary/12 border border-primary/25 w-fit">
                        {chip}
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                        {item.subtitle}
                      </p>
                    </div>
                    {item.is_automatic ? (
                      <p className="text-[11px] text-muted-foreground leading-snug border border-border/25 rounded-sm px-2.5 py-2 bg-muted/[0.06]">
                        No button needed — Medusa applies this when your order qualifies (e.g. after delivery
                        is set for shipping offers).
                      </p>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          'w-full h-9 rounded-sm text-[11px] font-semibold uppercase tracking-[0.12em]',
                          'border-primary/50 text-primary bg-background/50',
                          'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                          'transition-all duration-200',
                        )}
                        disabled={disabled || promoBusy}
                        onClick={() => onApplyCode(item.code)}
                      >
                        {applying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" aria-hidden />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/15 bg-muted/[0.06]">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/12 transition-colors rounded-sm"
          aria-expanded={manualOpen}
        >
          <span className="font-medium">Enter a code instead</span>
          {manualOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          )}
        </button>
        {manualOpen ? (
          <div className="px-4 pb-4 pt-0 space-y-2">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Must match your invite or campaign exactly. Applying replaces any other code you already added.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-sm sm:border sm:border-border/28 sm:bg-background/50 sm:overflow-hidden sm:shadow-sm">
              <Input
                id="promo-code-manual"
                value={promoInput}
                onChange={(e) => onPromoInputChange(e.target.value)}
                placeholder="Offer code"
                className="font-mono text-sm h-12 flex-1 rounded-sm border-border/35 sm:border-0 sm:shadow-none bg-background/85 focus-visible:ring-1 focus-visible:ring-primary/30"
                disabled={disabled || promoBusy}
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onApplyManual();
                  }
                }}
              />
              <Button
                type="button"
                className="h-12 sm:h-auto sm:min-h-12 sm:px-8 shrink-0 font-semibold uppercase tracking-wider text-xs rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-[0_0_28px_-8px_rgba(212,175,55,0.5)]"
                disabled={disabled || promoBusy || !promoInput.trim()}
                onClick={() => onApplyManual()}
              >
                {promoBusy && applyingCode === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
