import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { productPath } from '@/lib/productUrl';
import { Heart, ShoppingBag } from 'lucide-react';

/** Client-side wishlist (Zustand); not synced to Supabase. */
const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, addToCart } = useStore();

  if (wishlist.length === 0) {
    return (
      <Layout>
        <section className="pt-32 pb-24">
          <div className="container mx-auto px-6 text-center max-w-md">
            <Heart className="w-14 h-14 mx-auto mb-6 text-primary/40" />
            <h1 className="text-3xl font-display font-light mb-4">Your wishlist is empty</h1>
            <Link to="/shop">
              <Button variant="hero">Browse shop</Button>
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-28 pb-24">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl font-display font-light text-center mb-12">
            Wish<span className="text-gold-gradient">list</span>
          </h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {wishlist.map(({ product }, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden rounded-sm"
              >
                <Link to={productPath(product)} className="block aspect-square bg-muted">
                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                </Link>
                <div className="p-4 space-y-3">
                  <Link to={productPath(product)} className="font-display text-lg hover:text-primary">
                    {product.name}
                  </Link>
                  <p className="text-sm text-gold-gradient">{formatPrice(product.price, product.currencyCode)}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        product.hamperBundle?.slots?.length
                          ? navigate(productPath(product))
                          : addToCart(product)
                      }
                    >
                      <ShoppingBag className="w-4 h-4 mr-1" />
                      Add to cart
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeFromWishlist(product.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Wishlist;
