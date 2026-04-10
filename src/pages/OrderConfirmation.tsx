import { Link, useLocation } from 'react-router-dom';
import type { HttpTypes } from '@medusajs/types';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const OrderConfirmation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const order = location.state?.order as HttpTypes.StoreOrder | undefined;
  const displayId = order ? (order as { display_id?: string }).display_id : undefined;

  if (!order) {
    return (
      <Layout>
        <section className="pt-32 pb-24 container mx-auto px-6 max-w-lg text-center">
          <p className="text-muted-foreground mb-6">No order details here. Start from the shop or cart.</p>
          <Link to="/shop">
            <Button variant="hero">Continue shopping</Button>
          </Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-32 pb-24 container mx-auto px-6 max-w-3xl text-center">
        <h1 className="text-3xl md:text-4xl font-display font-semibold mb-4">
          Thank <span className="text-gold-gradient">you</span>
        </h1>
        <p className="text-muted-foreground mb-2">
          {displayId ? `Your order #${displayId} is confirmed.` : 'Your order is confirmed.'}
        </p>
        <p className="text-xs font-mono text-muted-foreground/80 mb-10 break-all">{order.id}</p>
        <div className="flex flex-col md:flex-row gap-3 justify-center items-center md:flex-nowrap">
          {user ? (
            <>
              <Link to={`/account/orders/${encodeURIComponent(order.id)}`}>
                <Button variant="luxuryOutline" size="lg" className="whitespace-nowrap">
                  View order details
                </Button>
              </Link>
              <Link to="/account/orders">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground whitespace-nowrap"
                >
                  All my orders
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/auth" state={{ from: '/account/orders' }}>
              <Button variant="luxuryOutline" size="lg" className="whitespace-nowrap">
                Sign in to track orders
              </Button>
            </Link>
          )}
          <Link to="/shop">
            <Button variant="hero" size="lg" className="whitespace-nowrap">
              Continue shopping
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default OrderConfirmation;
