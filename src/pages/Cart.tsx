import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import {
  refreshCartPricesFromMedusa,
  syncAllMedusaCartLinesNow,
} from '@/lib/medusa/cartSync';
import { useStore, cartItemLineKey } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { productPath } from '@/lib/productUrl';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';
import type { CartItem } from '@/lib/store';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, addToCart, cartTotal, clearCart } = useStore();

  const removeSingleHamperSection = (item: CartItem, slotId: string) => {
    const current = item.hamperSelections ?? {};
    if (!current[slotId]) return;
    const next = { ...current };
    delete next[slotId];
    removeFromCart(cartItemLineKey(item));
    addToCart(item.product, item.quantity, {
      hamperSelections: Object.keys(next).length > 0 ? next : undefined,
      giftMessage: item.giftMessage,
    });
  };

  const cartLineSignature = useMemo(
    () =>
      cart
        .map((i) => `${cartItemLineKey(i)}:${i.quantity}`)
        .sort()
        .join('|'),
    [cart],
  );

  const summaryCurrency = cart[0]?.product.currencyCode ?? 'INR';
  /** Always sum local line totals so amounts match what shoppers see (Medusa item_subtotal can be stale if server has extra/dup lines). */
  const localSubtotal = cartTotal();

  useEffect(() => {
    if (!isMedusaConfigured() || cart.length === 0) return;
    void (async () => {
      try {
        await refreshCartPricesFromMedusa();
        await syncAllMedusaCartLinesNow();
      } catch {
        /* ignore */
      }
    })();
  }, [cartLineSignature, cart.length]);

  if (cart.length === 0) {
    return (
      <Layout>
        <section className="pt-32 pb-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="w-24 h-24 mx-auto mb-8 rounded-full border border-primary/30 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-primary/50" />
              </div>
              <h1 className="text-3xl font-display font-semibold mb-4">
                Your Cart is Empty
              </h1>
              <p className="text-muted-foreground mb-8">
                Discover our exquisite collection and find something extraordinary.
              </p>
              <Link to="/shop">
                <Button variant="hero" size="xl">
                  Explore Collection
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-display font-semibold text-center">
              Shopping <span className="text-gold-gradient">Cart</span>
            </h1>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {cart.map((item, index) => (
                  <motion.div
                    key={cartItemLineKey(item)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-6 rounded-lg flex flex-col sm:flex-row gap-6"
                  >
                    {/* Image */}
                    <Link
                      to={productPath(item.product)}
                      className="w-full sm:w-32 h-32 rounded overflow-hidden bg-muted shrink-0"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">
                            {item.product.category}
                          </p>
                          <Link
                            to={productPath(item.product)}
                            className="font-display text-lg font-medium hover:text-primary transition-colors"
                          >
                            {item.product.name}
                          </Link>
                          {item.product.variantTitle ? (
                            <p className="text-sm text-muted-foreground mt-1">{item.product.variantTitle}</p>
                          ) : null}
                          {item.product.hamperBundle?.slots?.length &&
                          item.hamperSelections &&
                          Object.keys(item.hamperSelections).length > 0 ? (
                            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
                              {item.product.hamperBundle.slots.map((slot) => {
                                const sel = item.hamperSelections![slot.id];
                                const line = !sel
                                  ? slot.required
                                    ? 'No selection (required)'
                                    : 'No selection'
                                  : sel.productId === '__section__'
                                    ? 'Section selected (no product choice)'
                                    : [sel.productName, sel.variantLabel].filter(Boolean).join(' · ');
                                return (
                                  <li key={slot.id}>
                                    <span className="text-foreground/80 font-medium">{slot.label}:</span>{' '}
                                    {line}{' '}
                                    {sel ? (
                                      <button
                                        type="button"
                                        className="text-primary underline-offset-4 hover:underline"
                                        onClick={() => removeSingleHamperSection(item, slot.id)}
                                      >
                                        remove
                                      </button>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                          {item.giftMessage?.trim() ? (
                            <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/20 pl-3">
                              Note: {item.giftMessage.trim()}
                            </p>
                          ) : null}
                          {item.hamperSelections && Object.keys(item.hamperSelections).length > 0 ? (
                            <button
                              type="button"
                              className="mt-2 text-xs text-primary underline-offset-4 hover:underline"
                              onClick={() => {
                                const key = cartItemLineKey(item);
                                removeFromCart(key);
                                addToCart(item.product, item.quantity, {
                                  giftMessage: item.giftMessage,
                                });
                              }}
                            >
                              Remove hamper choices
                            </button>
                          ) : null}
                        </div>
                        <button
                          onClick={() => removeFromCart(cartItemLineKey(item))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        {/* Quantity */}
                        <div className="flex items-center border border-border/50 rounded">
                          <button
                            onClick={() =>
                              updateQuantity(cartItemLineKey(item), item.quantity - 1)
                            }
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(cartItemLineKey(item), item.quantity + 1)
                            }
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price: unit × qty + line total */}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {item.quantity} × {formatPrice(item.product.price, item.product.currencyCode)}
                          </p>
                          <span className="text-lg font-semibold text-gold-gradient tabular-nums">
                            {formatPrice(
                              item.product.price * item.quantity,
                              item.product.currencyCode,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={clearCart}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-8 rounded-lg sticky top-28"
              >
                <h2 className="text-xl font-display font-semibold mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 pb-6 border-b border-border/30">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Line totals</p>
                  <ul className="space-y-2 text-sm">
                    {cart.map((item) => {
                      const line = item.product.price * item.quantity;
                      const key = cartItemLineKey(item);
                      return (
                        <li key={key} className="flex justify-between gap-3 text-muted-foreground">
                          <span className="min-w-0">
                            <span className="text-foreground/90">{item.product.name}</span>
                          </span>
                          <span className="tabular-nums shrink-0">{formatPrice(line, item.product.currencyCode ?? summaryCurrency)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-between text-sm pt-2 border-t border-border/30">
                    <span className="font-medium text-foreground">Subtotal</span>
                    <span className="tabular-nums font-medium">{formatPrice(localSubtotal, summaryCurrency)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Shipping and tax are calculated at checkout.
                  </p>
                </div>

                <div className="flex justify-between py-6 border-b border-border/30">
                  <span className="font-semibold">Cart total</span>
                  <span className="text-xl font-semibold text-gold-gradient tabular-nums">
                    {formatPrice(localSubtotal, summaryCurrency)}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full group"
                    type="button"
                    onClick={() => navigate('/checkout')}
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Link to="/shop" className="block">
                    <Button variant="luxuryOutline" size="lg" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  Secure checkout powered by Razorpay
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
