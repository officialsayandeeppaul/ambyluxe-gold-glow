import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight, Package, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import { useInfiniteCustomerOrders } from '@/hooks/useCustomerOrders';
import {
  formatOrderMajorAmount,
  orderDisplayLabel,
  orderPrimaryLinePreview,
  orderShipmentStatePresentation,
  paymentStatusLabel,
} from '@/lib/medusa/orders';

function formatAcquiredDate(iso: string | Date | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [filterQ, setFilterQ] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true, state: { from: '/account/orders' } });
  }, [user, authLoading, navigate]);

  const enabled = isMedusaConfigured() && Boolean(user) && !authLoading;
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCustomerOrders(enabled);

  const orders = useMemo(() => data?.pages.flatMap((p) => p.orders) ?? [], [data?.pages]);
  const totalLoaded = orders.length;
  const totalReported = data?.pages[0]?.count;

  const q = filterQ.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    if (!q) return orders;
    return orders.filter((order) => {
      const preview = orderPrimaryLinePreview(order);
      const hay = [
        order.id,
        String((order as { display_id?: number }).display_id ?? ''),
        preview.primaryTitle,
        order.email,
        order.status,
        order.payment_status,
        order.fulfillment_status,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, q]);

  const portfolioMinor = useMemo(
    () => filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
    [filteredOrders],
  );
  const portfolioCurrency = filteredOrders[0]?.currency_code ?? orders[0]?.currency_code ?? 'INR';

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) void fetchNextPage();
      },
      { root: null, rootMargin: '280px', threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, orders.length]);

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
            Connect the Medusa backend and publishable key to view your order history.
          </p>
          <Link to="/shop">
            <Button variant="hero">Continue shopping</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  const showInitialSpinner = isLoading && !data;

  return (
    <Layout>
      <section className="pt-28 md:pt-32 pb-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, hsl(42 78% 52% / 0.05), transparent 52%)',
          }}
        />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
          >
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.45em] text-primary/80 mb-4">
                <Link to="/account" className="hover:text-primary transition-colors">
                  Account
                </Link>
                <ChevronRight className="w-3 h-3 text-border opacity-60" />
                <span className="text-primary">Orders</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.5em] text-primary/70 mb-3 block">Order history</span>
              <h1 className="text-4xl md:text-5xl font-display font-medium mb-3">
                My <span className="font-editorial italic text-gold-gradient">orders</span>
              </h1>
              <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-md">
                Latest orders first. All rows are live from your account - scroll to load more.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 lg:items-center shrink-0 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] max-w-md lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={filterQ}
                  onChange={(e) => setFilterQ(e.target.value)}
                  placeholder="Filter orders…"
                  className="pl-10 h-11 rounded-full border-border/40 bg-background/60 text-sm"
                  aria-label="Filter orders"
                />
              </div>
              <div className="flex items-center gap-3">
                {typeof totalReported === 'number' && totalReported > 0 ? (
                  <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground tabular-nums whitespace-nowrap">
                    {totalLoaded}
                    {totalLoaded < totalReported ? ` / ${totalReported}` : ''} orders
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground tabular-nums">
                    {totalLoaded} loaded
                  </span>
                )}
                <Link to="/account">
                  <Button
                    variant="luxuryOutline"
                    size="sm"
                    className="rounded-full text-[10px] uppercase tracking-wider"
                  >
                    Profile
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="container mx-auto px-6 mt-8">
          <div className="h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-6">
          {isError && (
            <div className="mb-8 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{error instanceof Error ? error.message : 'Could not load orders.'}</span>
              <Button type="button" variant="luxuryOutline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}

          {showInitialSpinner ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-primary/20 bg-muted/5 py-16 px-6 text-center max-w-md mx-auto">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-sm mb-6">You have not placed any orders yet.</p>
              <Link to="/shop">
                <Button variant="hero">Browse the shop</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* {atelierOrders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-10"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-display font-medium">Atelier creations</h2>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-primary mt-1">
                        In crafting
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {atelierOrders.map((order) => {
                      const href = `/account/orders/${encodeURIComponent(order.id)}`;
                      const preview = orderPrimaryLinePreview(order);
                      const phase = fulfillmentStatusLabel(order.fulfillment_status);
                      return (
                        <Link
                          key={order.id}
                          to={href}
                          className="snap-start shrink-0 w-[280px] sm:w-[300px] rounded-sm border border-primary/25 bg-gradient-to-br from-muted/20 to-background overflow-hidden group hover:border-primary/45 transition-colors"
                        >
                          <div className="flex h-full">
                            <div className="w-1 bg-primary/60 shrink-0" />
                            <div className="flex-1 p-4 min-w-0">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded-sm overflow-hidden border border-border/40 bg-muted/30 shrink-0">
                                  {preview.thumbnail ? (
                                    <img
                                      src={preview.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/35">
                                      <Package className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-display text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {orderDisplayLabel(order)}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {preview.primaryTitle}
                                  </p>
                                  <p className="text-[10px] uppercase tracking-wider text-primary/90 mt-2">
                                    Phase: {phase}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 h-0.5 rounded-full bg-border/50 overflow-hidden">
                                <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary/40 to-primary" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )} */}

              <div className="mb-6">
                <h2 className="text-lg font-display font-medium">Order list</h2>
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mt-1">Latest first</p>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No orders match “{filterQ.trim()}”.
                </p>
              ) : (
                <div className="rounded-sm border border-primary/20 overflow-hidden shadow-[0_0_0_1px_rgba(212,175,55,0.05)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-primary/15 bg-muted/10">
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Item</th>
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Order ID</th>
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium whitespace-nowrap">
                            Order date
                          </th>
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Order type</th>
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Status</th>
                          <th className="py-4 px-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium text-right">
                            Amount
                          </th>
                          <th className="py-4 px-2 w-12" aria-hidden />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order, idx) => {
                          const cc = order.currency_code || 'INR';
                          const href = `/account/orders/${encodeURIComponent(order.id)}`;
                          const preview = orderPrimaryLinePreview(order);
                          const ship = orderShipmentStatePresentation(order);
                          const orderType = 'ONLINE';
                          return (
                            <tr
                              key={order.id}
                              className={`border-b border-border/30 transition-colors hover:bg-primary/[0.03] group ${
                                idx % 2 === 1 ? 'bg-muted/[0.02]' : ''
                              }`}
                            >
                              <td className="py-4 px-4 align-middle w-[88px]">
                                <Link
                                  to={href}
                                  className="block w-14 h-14 rounded-sm overflow-hidden border border-border/40 bg-muted/25"
                                >
                                  {preview.thumbnail ? (
                                    <img
                                      src={preview.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}
                                </Link>
                              </td>
                              <td className="py-4 px-4 align-middle min-w-[200px]">
                                <Link
                                  to={href}
                                  className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors"
                                >
                                  {orderDisplayLabel(order)}
                                </Link>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                  {preview.primaryTitle}
                                  {preview.extraCount > 0
                                    ? ` · +${preview.extraCount} more`
                                    : ''}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[260px] mt-1">
                                  {order.id}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-middle whitespace-nowrap text-muted-foreground text-xs">
                                {formatAcquiredDate(order.created_at)}
                              </td>
                              <td className="py-4 px-4 align-middle">
                                <span className="inline-flex px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] border border-border/40 rounded-sm text-muted-foreground">{orderType}</span>
                              </td>
                              <td className="py-4 px-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${ship.dotClass}`}
                                    aria-hidden
                                  />
                                  <span
                                    className={`text-[10px] uppercase tracking-[0.18em] font-medium ${ship.labelClass}`}
                                  >
                                    {ship.label}
                                  </span>
                                </div>
                                <p className="text-[9px] text-muted-foreground/70 mt-1 uppercase tracking-wider">
                                  {paymentStatusLabel(order.payment_status)}
                                </p>
                              </td>
                              <td className="py-4 px-4 align-middle text-right">
                                <span className="font-display text-base font-medium tabular-nums text-gold-gradient">
                                  {formatOrderMajorAmount(order.total, cc)}
                                </span>
                              </td>
                              <td className="py-4 px-2 align-middle">
                                <Link
                                  to={href}
                                  className="inline-flex p-2 rounded-sm text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                  aria-label={`Open order ${orderDisplayLabel(order)}`}
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-8 mt-10 pt-8 border-t border-border/20">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-1">
                    Total orders
                  </p>
                  <p className="text-2xl md:text-3xl font-display font-light tabular-nums">
                    {typeof totalReported === 'number' && totalReported > 0
                      ? totalReported
                      : totalLoaded}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-1">
                    Portfolio (visible)
                  </p>
                  <p className="text-2xl md:text-3xl font-display font-light tabular-nums text-gold-gradient">
                    {formatOrderMajorAmount(portfolioMinor, portfolioCurrency)}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-1 uppercase tracking-wider">
                    Sum of orders in view{q ? ' (filtered)' : ''}
                    {hasNextPage ? ' · scroll for more' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 mt-8">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading more…
                  </div>
                )}
                {!hasNextPage && totalLoaded > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    All orders loaded
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default OrderHistory;
