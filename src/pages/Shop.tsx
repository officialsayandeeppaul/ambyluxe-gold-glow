import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/shop/ProductCard';
import { products, categories } from '@/lib/products';
import { SlidersHorizontal, X, Grid3X3, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      default:
        result.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
    }
    return result;
  }, [selectedCategory, sortBy]);

  return (
    <Layout>
      {/* Shop Hero — compact & functional */}
      <section className="pt-32 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 0%, hsl(42 78% 52% / 0.04), transparent 50%)'
        }} />
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-primary/70 mb-4 block">
              The Boutique
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-medium mb-3">
              Shop <span className="font-editorial italic text-gold-gradient">All Pieces</span>
            </h1>
            <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-md">
              Browse every handcrafted luxury piece in our catalogue.
            </p>
          </motion.div>
        </div>
        <div className="container mx-auto px-6 mt-8">
          <div className="h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-6">
          {/* Filters Bar — minimal & refined */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-5 border-b border-border/20">
            <div className="flex items-center gap-4">
              <Button
                variant="luxuryGhost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>

              {/* Desktop Categories — pill style */}
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 rounded-full border ${
                    !selectedCategory
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(42_78%_52%/0.2)]'
                      : 'text-muted-foreground border-border/30 hover:text-foreground hover:border-border/60'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 rounded-full border ${
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(42_78%_52%/0.2)]'
                        : 'text-muted-foreground border-border/30 hover:text-foreground hover:border-border/60'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Grid toggle + Sort */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-1 border border-border/30 rounded-full p-1">
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-1.5 rounded-full transition-colors ${gridCols === 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  className={`p-1.5 rounded-full transition-colors ${gridCols === 4 ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border border-border/30 rounded-full px-4 py-2 text-[11px] uppercase tracking-wider focus:outline-none focus:border-primary/50 transition-colors text-foreground"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low → High</option>
                  <option value="price-high">Price: High → Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mb-8 pb-6 border-b border-border/20"
              >
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 text-[11px] uppercase tracking-wider transition-all rounded-full border ${
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground border-border/30 hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 text-[11px] uppercase tracking-wider transition-all rounded-full border ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground border-border/30 hover:text-foreground'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filter Tag */}
          {selectedCategory && (
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-[11px] uppercase tracking-wider text-primary">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-primary/60 hover:text-primary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}

          {/* Result count */}
          <p className="text-xs text-muted-foreground mb-8 tracking-wider uppercase">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'piece' : 'pieces'}
          </p>

          {/* Products Grid — tight uniform grid (different from Collections stacked layout) */}
          <motion.div
            layout
            className={`grid grid-cols-2 sm:grid-cols-2 ${gridCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-5 md:gap-6`}
          >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-24">
              <p className="text-muted-foreground font-light text-lg font-display">No pieces found in this category.</p>
              <Button
                variant="luxuryOutline"
                size="lg"
                onClick={() => setSelectedCategory(null)}
                className="mt-8"
              >
                View All Pieces
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Shop;
