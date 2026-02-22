import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { products } from '@/lib/products';

export const FeaturedProducts = () => {
  const featuredProducts = products.filter((p) => p.isBestseller).slice(0, 4);

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(42 78% 52% / 0.3), transparent 60%)' }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header - Editorial Style */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-end">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-6">
              <span className="w-8 h-px bg-primary" />
              Curated Selection
            </span>
            <h2 className="text-display-md font-display font-light">
              Coveted
              <br />
              <span className="italic text-gold-gradient">Masterpieces</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="md:text-right"
          >
            <p className="text-muted-foreground font-light max-w-md md:ml-auto mb-6">
              Our most treasured pieces, each chosen for its exceptional beauty and 
              the extraordinary story it tells.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-primary hover:text-primary-glow transition-colors group"
            >
              View All Collection
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </motion.div>
        </div>

        {/* Products Grid - Masonry-like */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {featuredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.7, 
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1]
              }}
              className={index % 2 === 1 ? 'lg:mt-12' : ''}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center"
        >
          <div className="divider-gold mb-10 max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground font-light mb-4">
            Each piece comes with lifetime warranty & certificate of authenticity
          </p>
        </motion.div>
      </div>
    </section>
  );
};
