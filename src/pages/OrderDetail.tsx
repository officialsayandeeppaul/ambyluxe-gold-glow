import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  MapPin,
  Package,
  Truck,
  CreditCard,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type { HttpTypes } from '@medusajs/types';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import { useCustomerOrderDetail } from '@/hooks/useCustomerOrders';
import {
  collectTrackingLines,
  formatOrderMajorAmount,
  fulfillmentStatusLabel,
  getOrderFulfillments,
  getShiprocketMeta,
  humanizeOrderStatus,
  lineItemProductHandle,
  lineItemThumbnail,
  lineItemTitle,
  orderDisplayLabel,
  paymentStatusLabel,
} from '@/lib/medusa/orders';
import { productPath } from '@/lib/productUrl';

type LineBreakdownRow = { label: string; amountMinor: number };

function formatOrderedAt(iso: string | Date | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
}

type Addr = HttpTypes.StoreOrderAddress | null | undefined;

function numberFromUnknown(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.numeric_ != null) return numberFromUnknown(o.numeric_);
    if (o.numeric != null) return numberFromUnknown(o.numeric);
    if (o.value != null) return numberFromUnknown(o.value);
  }
  return null;
}

function lineMetadata(item: HttpTypes.StoreOrderLineItem): Record<string, unknown> {
  const top = (item as { metadata?: Record<string, unknown> | null }).metadata;
  if (top && typeof top === 'object') return top;
  const nested = (item as { detail?: { metadata?: Record<string, unknown> | null } | null }).detail
    ?.metadata;
  if (nested && typeof nested === 'object') return nested;
  return {};
}

/**
 * Dynamic line-level breakup from metadata (hamper slots / keep box / add-ons).
 * Falls back silently when metadata isn't present.
 */
function lineBreakdownRows(item: HttpTypes.StoreOrderLineItem): LineBreakdownRow[] {
  const rows: LineBreakdownRow[] = [];
  const meta = lineMetadata(item);

  const hamperRaw = meta.hamper_breakdown;
  if (Array.isArray(hamperRaw)) {
    for (const r of hamperRaw) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const label =
        (typeof row.slot_label === 'string' && row.slot_label.trim()) ||
        (typeof row.product_name === 'string' && row.product_name.trim()) ||
        'Add-on';
      const amountMinor = numberFromUnknown(row.unit_minor);
      if (amountMinor != null && amountMinor > 0) {
        rows.push({ label, amountMinor });
      }
    }
  }

  const keepBoxMinor =
    numberFromUnknown(meta.keep_box_minor) ??
    numberFromUnknown(meta.keepbox_minor) ??
    numberFromUnknown(meta.keep_box_price_minor) ??
    numberFromUnknown(meta.keepbox_price_minor);
  if (keepBoxMinor != null && keepBoxMinor > 0) {
    rows.push({ label: 'Keep box', amountMinor: keepBoxMinor });
  }

  return rows;
}

function lineSelectionNotes(item: HttpTypes.StoreOrderLineItem): string[] {
  const out: string[] = [];
  const meta = lineMetadata(item);

  const keepBox =
    meta.keep_box === true ||
    meta.keepbox === true ||
    meta.keep_box === 'true' ||
    meta.keepbox === 'true';
  if (keepBox) out.push('Keep box selected');

  const selRaw = meta.hamper_selections;
  if (selRaw && typeof selRaw === 'object' && !Array.isArray(selRaw)) {
    for (const v of Object.values(selRaw as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const row = v as Record<string, unknown>;
      const n = row.productName;
      if (typeof n === 'string' && n.trim()) {
        out.push(n.trim());
      }
    }
  }

  const gift = meta.gift_message;
  if (typeof gift === 'string' && gift.trim()) out.push('Gift message added');

  return [...new Set(out)];
}

function formatAddress(a: Addr): string[] {
  if (!a) return [];
  const lines: string[] = [];
  const name = [a.first_name, a.last_name].filter(Boolean).join(' ');
  if (name) lines.push(name);
  if (a.address_1) lines.push(a.address_1);
  if (a.address_2) lines.push(a.address_2);
  const cityLine = [a.city, a.province, a.postal_code].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (a.country_code) lines.push(a.country_code.toUpperCase());
  if (a.phone) lines.push(`Phone: ${a.phone}`);
  return lines;
}

type Step = { key: string; label: string; description: string; done: boolean; active: boolean };

function buildProgressSteps(order: HttpTypes.StoreOrder): Step[] {
  const pay = (order.payment_status ?? '').toLowerCase();
  const paid = pay === 'captured' || pay === 'authorized';
  const fulfillments = getOrderFulfillments(order);
  const tracking = collectTrackingLines(fulfillments);
  const shipped =
    tracking.length > 0 ||
    fulfillments.some((f) => Boolean(f.shipped_at)) ||
    ['fulfilled', 'shipped', 'partially_fulfilled'].includes(
      (order.fulfillment_status ?? '').toLowerCase(),
    );
  const delivered =
    fulfillments.some((f) => Boolean(f.delivered_at)) ||
    (order.fulfillment_status ?? '').toLowerCase() === 'delivered';

  const steps: Step[] = [
    {
      key: 'placed',
      label: 'Order placed',
      description: 'We received your order.',
      done: true,
      active: false,
    },
    {
      key: 'payment',
      label: 'Payment',
      description: paid ? 'Payment confirmed.' : 'Waiting for payment confirmation.',
      done: paid,
      active: !paid,
    },
    {
      key: 'fulfillment',
      label: 'Processing',
      description: shipped ? 'Packed and on the way.' : 'Preparing your jewellery for dispatch.',
      done: shipped,
      active: paid && !shipped,
    },
    {
      key: 'transit',
      label: 'In transit',
      description:
        tracking.length > 0
          ? 'Carrier tracking is available below.'
          : shipped
            ? 'Shipped — tracking may appear shortly.'
            : 'Tracking appears after dispatch.',
      done: shipped,
      active: shipped && tracking.length === 0,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: delivered ? 'Delivered. Enjoy your Amby Luxe piece.' : 'We will update this when delivered.',
      done: delivered,
      active: false,
    },
  ];
  return steps;
}

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const decodedId = orderId ? decodeURIComponent(orderId) : undefined;
  const enabled = isMedusaConfigured() && Boolean(user) && !authLoading && Boolean(decodedId);
  const { data: order, isLoading, isError, error, refetch, isFetching } = useCustomerOrderDetail(
    decodedId,
    enabled,
  );

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isMedusaConfigured()) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">
            Connect the Medusa backend and publishable key to view order details.
          </p>
          <Link to="/shop">
            <Button variant="hero">Continue shopping</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  if (!decodedId) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">Missing order.</p>
          <Link to="/account/orders">
            <Button variant="hero">Back to orders</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/account/orders"
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors mb-6 inline-block"
            >
              ← All orders
            </Link>

            {isError && (
              <div className="glass-card rounded-sm p-6 mb-8 border border-destructive/25">
                <p className="text-sm text-destructive mb-3">
                  {error instanceof Error ? error.message : 'Could not load this order.'}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="luxuryOutline" size="sm" onClick={() => void refetch()}>
                    Try again
                  </Button>
                  <Link to="/account/orders">
                    <Button type="button" variant="ghost" size="sm">
                      Order list
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {isLoading && !order ? (
              <div className="flex justify-center py-24">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : order ? (
              <>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
                  <div>
                    <span className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-primary mb-3">
                      <span className="w-8 h-px bg-primary" />
                      Order detail
                    </span>
                    <h1 className="text-display-sm font-display font-light">
                      Order <span className="italic text-gold-gradient">{orderDisplayLabel(order)}</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">{formatOrderedAt(order.created_at)}</p>
                    <p className="text-[11px] font-mono text-muted-foreground/70 mt-2 break-all">{order.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {paymentStatusLabel(order.payment_status)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {fulfillmentStatusLabel(order.fulfillment_status)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {humanizeOrderStatus(order.status)}
                    </Badge>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 mb-12">
                  <div className="glass-card rounded-sm p-6">
                    <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      Progress
                    </h2>
                    <ol className="space-y-0">
                      {buildProgressSteps(order).map((step, i, arr) => (
                        <li key={step.key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            {step.done ? (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            ) : step.active ? (
                              <span className="w-5 h-5 rounded-full border-2 border-primary shrink-0 flex items-center justify-center">
                                <Circle className="w-2 h-2 text-primary fill-primary" />
                              </span>
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground/35 shrink-0" />
                            )}
                            {i < arr.length - 1 && (
                              <span className="w-px flex-1 min-h-[28px] bg-border/60 my-1" />
                            )}
                          </div>
                          <div className={i < arr.length - 1 ? 'pb-6' : ''}>
                            <p className="font-medium text-sm">{step.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="glass-card rounded-sm p-6">
                    <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Summary
                    </h2>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Subtotal</dt>
                        <dd className="tabular-nums">
                          {formatOrderMajorAmount(
                            (order as { subtotal?: number }).subtotal,
                            order.currency_code || 'INR',
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Shipping</dt>
                        <dd className="tabular-nums">
                          {formatOrderMajorAmount(
                            (order as { shipping_total?: number }).shipping_total,
                            order.currency_code || 'INR',
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Tax</dt>
                        <dd className="tabular-nums">
                          {formatOrderMajorAmount(
                            (order as { tax_total?: number }).tax_total,
                            order.currency_code || 'INR',
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Discounts</dt>
                        <dd className="tabular-nums">
                          {formatOrderMajorAmount(
                            (order as { discount_total?: number }).discount_total,
                            order.currency_code || 'INR',
                          )}
                        </dd>
                      </div>
                      <Separator className="my-2 bg-border/40" />
                      <div className="flex justify-between gap-4 text-base font-medium">
                        <dt>Total</dt>
                        <dd className="tabular-nums text-gold-gradient">
                          {formatOrderMajorAmount(order.total, order.currency_code || 'INR')}
                        </dd>
                      </div>
                    </dl>
                    {isFetching && (
                      <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-wider">
                        Refreshing…
                      </p>
                    )}
                  </div>
                </div>

                {(() => {
                  const fulfillments = getOrderFulfillments(order);
                  const tracking = collectTrackingLines(fulfillments);
                  const sr = getShiprocketMeta(
                    (order as { metadata?: Record<string, unknown> }).metadata,
                  );
                  if (tracking.length === 0 && !sr) return null;
                  return (
                    <div className="glass-card rounded-sm p-6 mb-10">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        Shipping & tracking
                      </h2>
                      {sr && (
                        <div className="mb-4 rounded-sm border border-border/40 bg-muted/10 p-4 text-sm">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                            Logistics (Shiprocket)
                          </p>
                          <ul className="space-y-1 text-muted-foreground text-xs">
                            {sr.sr_order_id != null && (
                              <li>
                                Shiprocket order ID:{' '}
                                <span className="font-mono text-foreground">{String(sr.sr_order_id)}</span>
                              </li>
                            )}
                            {sr.shipment_id != null && (
                              <li>
                                Shipment ID:{' '}
                                <span className="font-mono text-foreground">{String(sr.shipment_id)}</span>
                              </li>
                            )}
                            {sr.status === 'error' && sr.last_error && (
                              <li className="text-destructive/90">Last sync note: {sr.last_error}</li>
                            )}
                            {sr.pushed_at && (
                              <li className="text-muted-foreground/70">Updated {formatOrderedAt(sr.pushed_at)}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {tracking.length > 0 && (
                        <ul className="space-y-3">
                          {tracking.map((t, idx) => (
                            <li
                              key={`${t.tracking_number ?? ''}-${idx}`}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-sm border border-border/40 bg-background-elevated/30 p-4"
                            >
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Tracking number
                                </p>
                                <p className="font-mono text-sm mt-0.5">{t.tracking_number ?? '—'}</p>
                              </div>
                              {t.tracking_url && (
                                <a
                                  href={t.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary hover:underline"
                                >
                                  Track shipment
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}

                <div className="glass-card rounded-sm p-6 mb-10">
                  <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">Items</h2>
                  <ul className="divide-y divide-border/30">
                    {(order.items ?? []).map((item) => {
                      const title = lineItemTitle(item);
                      const thumb = lineItemThumbnail(item);
                      const handle = lineItemProductHandle(item);
                      const unitMinor = item.unit_price ?? 0;
                      const qty = Math.max(1, item.quantity ?? 1);
                      const lineMinor =
                        item.subtotal ?? item.total ?? unitMinor * qty;
                      const breakup = lineBreakdownRows(item);
                      const notes = lineSelectionNotes(item);
                      const vid = (item as { variant_id?: string }).variant_id;
                      const pid =
                        (item as { variant?: { product?: { id?: string } } }).variant?.product?.id;
                      const canLink = Boolean(handle && pid);
                      const row = (
                        <div className="flex gap-4 flex-1 min-w-0 items-center">
                          <div className="w-14 h-14 rounded-sm bg-muted/30 overflow-hidden shrink-0 border border-border/30">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors">
                              {title}
                            </p>
                            {item.variant_title && item.variant_title !== title && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.variant_title}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Qty {qty} · {formatOrderMajorAmount(unitMinor, order.currency_code || 'INR')} each
                              {vid && (
                                <span className="font-mono text-[10px] ml-2 opacity-70">{vid}</span>
                              )}
                            </p>
                            {breakup.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {breakup.map((b, idx) => (
                                  <p key={`${b.label}-${idx}`} className="text-[11px] text-muted-foreground">
                                    {b.label}: {formatOrderMajorAmount(b.amountMinor, order.currency_code || 'INR')}
                                  </p>
                                ))}
                              </div>
                            )}
                            {notes.length > 0 && (
                              <p className="text-[11px] text-muted-foreground/80 mt-1">
                                Selected: {notes.join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium tabular-nums">
                              {formatOrderMajorAmount(lineMinor, order.currency_code || 'INR')}
                            </p>
                          </div>
                        </div>
                      );
                      return (
                        <li key={item.id} className="py-4 first:pt-0">
                          {canLink ? (
                            <Link
                              to={productPath({ id: pid!, handle: handle! })}
                              className="flex group rounded-sm -m-1 p-1 hover:bg-muted/15 transition-colors"
                            >
                              {row}
                            </Link>
                          ) : (
                            row
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card rounded-sm p-6">
                    <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Shipping address
                    </h2>
                    <address className="not-italic text-sm text-muted-foreground space-y-0.5 leading-relaxed">
                      {formatAddress(order.shipping_address).map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                      {formatAddress(order.shipping_address).length === 0 && (
                        <span>No address on file for this order.</span>
                      )}
                    </address>
                  </div>
                  <div className="glass-card rounded-sm p-6">
                    <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Billing address
                    </h2>
                    <address className="not-italic text-sm text-muted-foreground space-y-0.5 leading-relaxed">
                      {formatAddress((order as { billing_address?: Addr }).billing_address).map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                      {formatAddress((order as { billing_address?: Addr }).billing_address).length === 0 && (
                        <span>Same as shipping or not provided.</span>
                      )}
                    </address>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                  <Link to="/shop">
                    <Button variant="hero">Continue shopping</Button>
                  </Link>
                  <Link to="/account/orders">
                    <Button variant="luxuryOutline">All orders</Button>
                  </Link>
                </div>
              </>
            ) : !isError ? (
              <p className="text-center text-muted-foreground py-16">Order not found.</p>
            ) : null}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default OrderDetail;
