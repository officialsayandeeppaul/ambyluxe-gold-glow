import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useShowcaseCollections } from '@/hooks/useCollections';
import {
  SHOWCASE_FALLBACK_PUBLIC,
  type ShowcaseCollection,
} from '@/lib/medusa/collections';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGES = [
  SHOWCASE_FALLBACK_PUBLIC,
  '/images/products/product-bangles.jpg',
  '/images/products/product-pendant.jpg',
] as const;

function CollectionCardImage({ collection }: { collection: ShowcaseCollection }) {
  const imageCandidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of [collection.image, ...FALLBACK_IMAGES]) {
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
    return out;
  }, [collection.image, collection.medusaId]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const imgSrc = imageCandidates[Math.min(candidateIdx, imageCandidates.length - 1)];

  useEffect(() => {
    setCandidateIdx(0);
  }, [collection.image, collection.medusaId]);

  return (
    <motion.img
      src={imgSrc}
      alt={collection.name}
      onError={() => {
        setCandidateIdx((i) => (i < imageCandidates.length - 1 ? i + 1 : i));
      }}
      className="w-full h-full object-cover transition-transform duration-1200 group-hover:scale-110"
    />
  );
}

export const Collections = () => {
  const { data: showcaseCollections = [], isLoading } = useShowcaseCollections('homepage');
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={containerRef} className="section-padding bg-background relative overflow-x-hidden overflow-y-visible">
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
            and aesthetic language — powered by your Medusa catalogue when connected.
          </p>
        </motion.div>

        {/* Collections — Stacked editorial cards (distinct from Shop's grid) */}
        <div className="space-y-20 md:space-y-28">
          {isLoading &&
            [0, 1, 2].map((i) => (
              <div key={`sk-${i}`} className="h-64 rounded-sm bg-muted/30 animate-pulse" />
            ))}
          {!isLoading &&
            showcaseCollections.map((collection, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={collection.medusaId}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ 
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                <Link
                  to={`/shop?collection=${encodeURIComponent(collection.handle)}`}
                  className="group grid grid-cols-12 gap-6 md:gap-10 items-center min-w-0 max-w-full overflow-visible"
                >
                  {/* Image */}
                  <motion.div 
                    className={`col-span-12 md:col-span-7 relative overflow-hidden rounded-sm min-w-0 max-w-full ${isEven ? 'md:order-1' : 'md:order-2'}`}
                    style={{ y: index === 1 ? y : undefined }}
                  >
                    <div className="aspect-[16/10] overflow-hidden rounded-sm relative">
                      <CollectionCardImage collection={collection} />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                      
                      {/* Gold shimmer on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{ background: 'radial-gradient(ellipse at center, hsl(42 78% 52% / 0.08), transparent 70%)' }}
                      />
                    </div>
                    {/* Decorative border frame */}
                    <div className="absolute inset-3 border border-primary/0 group-hover:border-primary/15 transition-colors duration-700 rounded-sm pointer-events-none" />
                  </motion.div>

                  {/* Content — flex + items-end/start so max-w-sm copy shares the same edge as title */}
                  <div
                    className={cn(
                      'col-span-12 md:col-span-5 flex min-w-0 max-w-full flex-col gap-5',
                      '[overflow-wrap:anywhere] break-words',
                      isEven
                        ? 'md:order-2 md:pl-4 items-start text-left'
                        : 'md:order-1 md:pr-4 items-end text-right',
                    )}
                  >
                    <header
                      className={cn(
                        'flex w-full max-w-lg flex-col gap-3 min-w-0 overflow-visible',
                        !isEven && 'items-end text-right',
                      )}
                    >
                      <span className="text-[11px] uppercase tracking-[0.4em] text-primary/70 font-medium">
                        {collection.tagline}
                      </span>
                      <h3
                        className={cn(
                          'text-4xl md:text-5xl lg:text-6xl font-display font-medium text-foreground',
                          'text-balance leading-[1.22] md:leading-[1.18]',
                          'group-hover:text-gold-gradient transition-[color] duration-500',
                          'min-w-0 max-w-full overflow-visible pb-1.5',
                        )}
                      >
                        {collection.name}
                      </h3>
                    </header>
                    <p
                      className={cn(
                        'text-muted-foreground font-light text-sm leading-relaxed',
                        'w-full max-w-sm min-w-0 text-pretty',
                      )}
                    >
                      {collection.shortDescription}
                    </p>
                    <div
                      className={cn(
                        'flex max-w-sm w-full flex-wrap items-center gap-x-4 gap-y-2',
                        !isEven && 'justify-end',
                      )}
                    >
                      <span className="text-xs text-muted-foreground tracking-wider uppercase shrink-0">
                        {collection.itemCount} {collection.itemCount === 1 ? 'Piece' : 'Pieces'}
                      </span>
                      <span className="h-px w-8 shrink-0 bg-primary/30" />
                      <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        Explore
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2 motion-reduce:transform-none" />
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
