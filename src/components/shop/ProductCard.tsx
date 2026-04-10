import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product, useStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { productPath } from '@/lib/productUrl';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const {
    addToCart,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    isInCart,
    cartQuantityForProduct,
    hasConfiguredHamperInCart,
  } = useStore();
  const isHamper = Boolean(product.hamperBundle?.slots?.length);
  const hamperInCart = isHamper ? hasConfiguredHamperInCart(product.id) : false;
  const hamperLineQty = useStore((s) =>
    isHamper
      ? s.cart
          .filter(
            (i) =>
              i.product.id === product.id &&
              i.hamperSelections &&
              Object.keys(i.hamperSelections).length > 0,
          )
          .reduce((acc, i) => acc + i.quantity, 0)
      : 0,
  );
  const inWishlist = isInWishlist(product.id);
  const inCart = !isHamper && isInCart(product);
  const inCartQty = !isHamper ? cartQuantityForProduct(product) : 0;
  const viewCartQty = isHamper ? hamperLineQty : inCartQty;
  const showViewCart = isHamper ? hamperInCart : inCart;

  const goToProduct = () => navigate(productPath(product));

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isHamper) {
      goToProduct();
      return;
    }
    addToCart(product, 1);
  };

  const handleViewCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/cart');
  };

  const showActions = isHamper || inCart || isHovered;

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Image Container */}
      <div
        role="link"
        tabIndex={0}
        onClick={goToProduct}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToProduct();
          }
        }}
        className="relative aspect-[3/4] overflow-hidden rounded-sm bg-background-elevated cursor-pointer"
      >
        <motion.img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 80%, hsl(42 78% 52% / 0.1), transparent 60%)',
          }}
        />

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          {product.isNew && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-block bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-sm font-medium"
            >
              New
            </motion.span>
          )}
          {product.originalPrice && (
            <span className="inline-block bg-accent/90 text-accent-foreground text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-sm font-medium">
              Sale
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlistToggle}
          className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 z-10 ${
            inWishlist
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/60 backdrop-blur-sm text-foreground/70 hover:bg-primary hover:text-primary-foreground'
          }`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: showActions ? 1 : 0,
            y: showActions ? 0 : 20,
          }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-10"
        >
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full bg-primary/95 backdrop-blur-sm text-primary-foreground py-3.5 px-6 text-xs uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-2 hover:bg-primary transition-colors rounded-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            {showViewCart ? 'Add more to bag' : 'Add to cart'}
          </button>
          {showViewCart ? (
            <button
              type="button"
              onClick={handleViewCart}
              className="w-full py-2.5 px-4 text-[11px] uppercase tracking-[0.15em] font-medium rounded-sm border border-border/70 bg-background/90 text-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              View cart
              {viewCartQty > 0 ? ` (${viewCartQty})` : ''}
            </button>
          ) : null}
        </motion.div>

        <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/20 transition-colors duration-500 rounded-sm pointer-events-none" />
      </div>

      <div
        role="link"
        tabIndex={0}
        className="block pt-5 cursor-pointer"
        onClick={goToProduct}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToProduct();
          }
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2 font-medium">
          {product.tagline || product.collection || product.category}
        </p>
        <h3 className="font-display text-lg text-foreground mb-2 line-clamp-1 group-hover:text-gold-gradient transition-all duration-300">
          {product.name}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-base font-medium text-gold-gradient">
            {formatPrice(product.price, product.currencyCode)}
          </span>
          {product.originalPrice != null && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.originalPrice, product.currencyCode)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
