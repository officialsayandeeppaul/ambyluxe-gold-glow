import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import productBracelet from '@/assets/product-bracelet.jpg';
import productBangles from '@/assets/product-bangles.jpg';
import productPendant from '@/assets/product-pendant.jpg';

const collections = [
  {
    id: 'timeless',
    name: 'Timeless',
    tagline: 'Classic Elegance',
    description: 'Designs that transcend trends and become heirlooms passed down through generations.',
    image: productBracelet,
    itemCount: 24,
  },
  {
    id: 'heritage',
    name: 'Heritage',
    tagline: 'Royal Inspiration',
    description: 'Inspired by centuries of Indian craftsmanship and regal traditions.',
    image: productBangles,
    itemCount: 18,
  },
  {
    id: 'celestial',
    name: 'Celestial',
    tagline: 'Ethereal Beauty',
    description: 'Pieces inspired by the magic of the cosmos and celestial wonders.',
    image: productPendant,
    itemCount: 16,
  },
];

export const Collections = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={containerRef} className="section-padding bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(42 78% 52% / 0.3), transparent 60%)' }}
      />

      <div className="container mx-auto px-6">
        {/* Section Header — Full-width editorial */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.5em] text-primary mb-8">
            <span className="w-12 h-px bg-primary/60" />
            Explore
            <span className="w-12 h-px bg-primary/60" />
          </span>
          <h2 className="text-display-lg font-display font-medium mb-8">
            Our <span className="italic text-gold-gradient">Collections</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-light text-base leading-relaxed">
            Three distinct expressions of luxury, each with its own philosophy 
            and aesthetic language.
          </p>
        </motion.div>

        {/* Collections — Stacked editorial cards (distinct from Shop's grid) */}
        <div className="space-y-20 md:space-y-28">
          {collections.map((collection, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ 
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                <Link
                  to={`/shop?collection=${collection.id}`}
                  className="group grid grid-cols-12 gap-6 md:gap-10 items-center"
                >
                  {/* Image */}
                  <motion.div 
                    className={`col-span-12 md:col-span-7 relative overflow-hidden rounded-sm ${isEven ? 'md:order-1' : 'md:order-2'}`}
                    style={{ y: index === 1 ? y : undefined }}
                  >
                    <div className="aspect-[16/10] overflow-hidden rounded-sm relative">
                      <motion.img
                        src={collection.image}
                        alt={collection.name}
                        className="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                      
                      {/* Gold shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{ background: 'radial-gradient(ellipse at center, hsl(42 78% 52% / 0.08), transparent 70%)' }}
                      />
                    </div>
                    {/* Decorative border frame */}
                    <div className="absolute inset-3 border border-primary/0 group-hover:border-primary/15 transition-colors duration-700 rounded-sm pointer-events-none" />
                  </motion.div>

                  {/* Content */}
                  <div className={`col-span-12 md:col-span-5 ${isEven ? 'md:order-2 md:pl-4' : 'md:order-1 md:pr-4 md:text-right'}`}>
                    <span className={`text-[11px] uppercase tracking-[0.4em] text-primary/70 mb-4 block font-medium ${!isEven ? 'md:text-right' : ''}`}>
                      {collection.tagline}
                    </span>
                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium text-foreground mb-5 group-hover:text-gold-gradient transition-all duration-500">
                      {collection.name}
                    </h3>
                    <p className="text-muted-foreground font-light mb-6 leading-relaxed text-sm max-w-sm">
                      {collection.description}
                    </p>
                    <div className={`flex items-center gap-4 ${!isEven ? 'md:justify-end' : ''}`}>
                      <span className="text-xs text-muted-foreground tracking-wider uppercase">
                        {collection.itemCount} Pieces
                      </span>
                      <span className="w-8 h-px bg-primary/30" />
                      <span className="inline-flex items-center gap-2 text-sm text-primary font-medium tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        Explore
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
