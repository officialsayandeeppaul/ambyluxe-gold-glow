import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { products, formatPrice } from '@/lib/products';
import { useStore } from '@/lib/store';
import { Heart, Minus, Plus, ChevronLeft, Check, Truck, Shield, RotateCcw } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useStore();

  if (!product) {
    return (
      <Layout>
        <div className="pt-32 pb-24 text-center">
          <h1 className="text-2xl font-display">Product not found</h1>
          <Link to="/shop" className="text-primary mt-4 inline-block">
            Return to Shop
          </Link>
        </div>
      </Layout>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const images = product.images || [product.image];

  return (
    <Layout>
      <section className="pt-28 pb-24">
        <div className="container mx-auto px-6">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <Link
              to="/shop"
              className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Shop
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Main Image */}
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border-gold-glow mb-4">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedImage}
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.isNew && (
                    <span className="bg-primary text-primary-foreground text-xs uppercase tracking-wider px-3 py-1 rounded">
                      New
                    </span>
                  )}
                  {product.originalPrice && (
                    <span className="bg-accent text-accent-foreground text-xs uppercase tracking-wider px-3 py-1 rounded">
                      Sale
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded overflow-hidden border-2 transition-colors ${
                        selectedImage === index
                          ? 'border-primary'
                          : 'border-transparent hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">
                {product.collection || product.category}
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold mb-6">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-2xl md:text-3xl font-semibold text-gold-gradient">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed mb-8">
                {product.description}
              </p>

              {/* Details */}
              {product.details && (
                <div className="mb-8">
                  <h3 className="text-sm uppercase tracking-wider font-semibold mb-4">
                    Details
                  </h3>
                  <ul className="space-y-2">
                    {product.details.map((detail, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Materials */}
              {product.materials && (
                <div className="mb-8 pb-8 border-b border-border/30">
                  <h3 className="text-sm uppercase tracking-wider font-semibold mb-2">
                    Materials
                  </h3>
                  <p className="text-muted-foreground">{product.materials}</p>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex items-center border border-border/50 rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  variant="hero"
                  size="xl"
                  onClick={handleAddToCart}
                  className="flex-1"
                >
                  Add to Cart
                </Button>

                <Button
                  variant={inWishlist ? 'luxury' : 'luxuryOutline'}
                  size="xl"
                  onClick={handleWishlistToggle}
                  className="px-5"
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 glass-card rounded-lg">
                  <Truck className="w-5 h-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Free Shipping</p>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <Shield className="w-5 h-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Lifetime Warranty</p>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <RotateCcw className="w-5 h-5 mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">30-Day Returns</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-24">
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-center mb-12">
                You May Also Love
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
