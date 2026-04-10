import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import heroCollection from '@/assets/hero-collection.jpg';
import { useShowcaseCollections } from '@/hooks/useCollections';
import {
  SHOWCASE_FALLBACK_PUBLIC,
  type ShowcaseCollection,
} from '@/lib/medusa/collections';
import { cn } from '@/lib/utils';

const Collections = () => {
  const { handle: collectionHandleParam } = useParams<{ handle?: string }>();
  const handleTrim = collectionHandleParam?.trim();
  if (handleTrim) {
    return (
      <Navigate to={`/shop?collection=${encodeURIComponent(handleTrim)}`} replace />
    );
  }

  const { data: showcaseCollections = [], isLoading } = useShowcaseCollections('all');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroScroll, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);

  const countLabel = showcaseCollections.length || 3;

  return (
    <Layout>
      {/* Cinematic Full-Bleed Hero */}
      <section ref={heroRef} className="relative min-h-screen h-screen overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <img
            src={heroCollection}
            alt="Amby Luxe Collections"
            className="w-full h-[110%] object-cover"
          />
        </motion.div>

        {/* Dark cinematic overlay - stronger top for navbar/logo visibility on large screens */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 from-0 via-background/30 via-[15%] to-background to-[70%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />

        {/* Decorative gold lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 flex items-center justify-center pt-20"
        >
          <div className="text-center px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-5 text-[10px] uppercase tracking-[0.6em] text-primary/90 mb-8">
                <span className="w-16 h-px bg-primary/50" />
                <Sparkles className="w-3 h-3" />
                Curated Luxury
                <Sparkles className="w-3 h-3" />
                <span className="w-16 h-px bg-primary/50" />
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="font-editorial text-7xl md:text-8xl lg:text-9xl font-light italic text-foreground mb-6 leading-[0.9]"
            >
              The <span className="text-gold-gradient not-italic font-medium">Collections</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-foreground/60 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed tracking-wide"
            >
              {countLabel} expressions of luxury from our catalogue — synced from Medusa when your
              store is connected.
            </motion.p>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <span className="text-[9px] uppercase tracking-[0.4em] text-foreground/40">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-8 bg-gradient-to-b from-primary/60 to-transparent"
          />
        </motion.div>
      </section>

      {/* Collection Showcases — Full-width immersive sections */}
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={`sk-${i}`} className="grid grid-cols-1 lg:grid-cols-2 min-h-[50vh] animate-pulse bg-muted/20" />
        ))}
      {!isLoading &&
        showcaseCollections.map((collection, index) => (
          <CollectionShowcase key={collection.medusaId} collection={collection} index={index} />
        ))}

      {/* Bottom CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(42 78% 52% / 0.04), transparent 60%)'
        }} />
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-editorial text-4xl md:text-5xl italic text-foreground/90 mb-6">
              Every piece tells a story
            </h2>
            <p className="text-muted-foreground font-light mb-10 max-w-md mx-auto">
              Visit our boutique to experience these collections in person.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-3 btn-luxury bg-primary text-primary-foreground px-10 py-4 text-xs uppercase tracking-[0.2em] font-medium rounded-sm"
            >
              Shop All Pieces
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

interface CollectionShowcaseProps {
  collection: ShowcaseCollection;
  index: number;
}

const FALLBACK_IMAGES = [
  SHOWCASE_FALLBACK_PUBLIC,
  '/images/products/product-bangles.jpg',
  '/images/products/product-pendant.jpg',
] as const;

const CollectionShowcase = ({ collection, index }: CollectionShowcaseProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const isEven = index % 2 === 0;

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

  const copySafe = 'min-w-0 max-w-full [overflow-wrap:anywhere] break-words';

  return (
    <section ref={ref} className="relative py-0 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh] min-w-0 w-full max-w-full">
        {/* Image Side — group scoped here only so hovering copy does not zoom/crop the photo */}
        <motion.div
          className={cn(
            'group/showcase relative overflow-hidden min-h-[50vh] lg:min-h-[85vh] min-w-0 max-w-full',
            isEven ? 'lg:order-1' : 'lg:order-2',
          )}
        >
          <motion.div
            className="absolute inset-0 w-full h-[128%] -top-[14%] left-0"
            style={{ y: imgY }}
          >
            <img
              src={imgSrc}
              alt={collection.name}
              onError={() => {
                setCandidateIdx((i) =>
                  i < imageCandidates.length - 1 ? i + 1 : i,
                );
              }}
              className="h-full w-full object-cover transition-transform duration-1000 ease-out motion-reduce:transform-none group-hover/showcase:scale-[1.04] group-focus-within/showcase:scale-[1.04]"
            />
          </motion.div>

          <div
            className={cn(
              'absolute inset-0 from-transparent via-transparent to-background/85 pointer-events-none hidden lg:block',
              isEven ? 'bg-gradient-to-r' : 'bg-gradient-to-l',
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-background/25 lg:hidden pointer-events-none" />
          <div
            className="absolute inset-0 opacity-40 group-hover/showcase:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, hsl(42 78% 52% / 0.12), transparent 65%)',
            }}
          />
          <div className="absolute inset-4 sm:inset-6 border border-primary/0 group-hover/showcase:border-primary/20 transition-colors duration-700 rounded-sm pointer-events-none" />

          <div className={cn('absolute top-8', isEven ? 'left-8' : 'right-8')}>
            <span className="font-editorial text-8xl md:text-9xl font-light italic text-foreground/10">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        {/* Content Side — overflow visible so link/title motion is never clipped */}
        <div
          className={cn(
            'flex items-center min-w-0 max-w-full px-8 py-16 lg:py-0 overflow-visible',
            isEven ? 'lg:order-2 lg:pl-16 xl:pl-24' : 'lg:order-1 lg:pr-16 xl:pr-24 lg:text-right',
          )}
        >
          <motion.div
            initial={{ opacity: 0, x: isEven ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'w-full max-w-lg min-w-0 space-y-6',
              copySafe,
              !isEven && 'lg:ml-auto',
            )}
          >
            <header className={cn('space-y-4', copySafe)}>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-[0.5em] text-primary/80 block font-medium',
                  copySafe,
                )}
              >
                {collection.tagline}
              </span>

              <h2
                className={cn(
                  'font-editorial text-6xl md:text-7xl lg:text-8xl font-light italic text-foreground',
                  'leading-[1.08] pb-1 text-balance',
                  copySafe,
                )}
              >
                {collection.name}
              </h2>

              <div
                className={cn(
                  'w-20 max-w-full h-px shrink-0 bg-primary/40',
                  !isEven ? 'lg:ml-auto' : '',
                )}
              />
            </header>

            <p
              className={cn(
                'text-muted-foreground font-light text-base leading-relaxed sm:leading-[1.85] max-w-prose',
                'text-pretty',
                copySafe,
                !isEven && 'lg:ml-auto lg:text-right',
              )}
            >
              {collection.longDescription}
            </p>

            <div
              className={cn(
                'flex flex-wrap items-center gap-x-6 gap-y-3 pt-2',
                !isEven ? 'lg:justify-end' : '',
              )}
            >
              <span
                className={cn(
                  'text-[10px] text-muted-foreground/60 tracking-[0.3em] uppercase shrink-0',
                  copySafe,
                )}
              >
                {collection.itemCount} {collection.itemCount === 1 ? 'Piece' : 'Pieces'}
              </span>
              <Link
                to={`/shop?collection=${encodeURIComponent(collection.handle)}`}
                className="group/btn inline-flex items-center gap-3 text-sm text-primary font-medium tracking-[0.15em] uppercase transition-all duration-500 hover:gap-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              >
                Explore
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover/btn:translate-x-1 motion-reduce:transform-none" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
    </section>
  );
};

export default Collections;
