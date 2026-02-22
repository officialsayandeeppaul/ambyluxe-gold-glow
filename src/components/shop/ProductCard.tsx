import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product, useStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useStore();
  const inWishlist = isInWishlist(product.id);

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
    addToCart(product);
  };

  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative"
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-background-elevated">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.08 : 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Gold glow on hover */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ 
              background: 'radial-gradient(ellipse at 50% 80%, hsl(42 78% 52% / 0.1), transparent 60%)' 
            }}
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
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

          {/* Wishlist Button - Always visible */}
          <button
            onClick={handleWishlistToggle}
            className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
              inWishlist
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/60 backdrop-blur-sm text-foreground/70 hover:bg-primary hover:text-primary-foreground'
            }`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          {/* Quick Add - Appears on hover */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-4 right-4"
          >
            <button
              onClick={handleAddToCart}
              className="w-full bg-primary/95 backdrop-blur-sm text-primary-foreground py-3.5 px-6 text-xs uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-2 hover:bg-primary transition-colors rounded-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Cart
            </button>
          </motion.div>

          {/* Border on hover */}
          <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/20 transition-colors duration-500 rounded-sm pointer-events-none" />
        </div>

        {/* Content */}
        <div className="pt-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2 font-medium">
            {product.collection || product.category}
          </p>
          <h3 className="font-display text-lg text-foreground mb-2 line-clamp-1 group-hover:text-gold-gradient transition-all duration-300">
            {product.name}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-gold-gradient">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
