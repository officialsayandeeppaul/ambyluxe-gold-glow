import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { collections } from '@/lib/products';
import heroCollection from '@/assets/hero-collection.jpg';

const collectionsMeta = [
  {
    ...collections[0],
    tagline: 'Enduring Elegance',
    longDescription: 'Masterpieces that defy the passage of time. Each piece in our Timeless collection is designed to become an heirloom — a bridge between generations, carrying stories of love and legacy.',
    itemCount: 24,
  },
  {
    ...collections[1],
    tagline: 'Royal Legacy',
    longDescription: 'Born from centuries of Indian royal craftsmanship, the Heritage collection honours tradition while embracing contemporary sophistication. Every piece tells the story of emperors and artisans.',
    itemCount: 18,
  },
  {
    ...collections[2],
    tagline: 'Cosmic Radiance',
    longDescription: 'Inspired by the infinite beauty of the cosmos — the shimmer of distant stars, the glow of the moon, the aurora of twilight. The Celestial collection captures the ethereal in precious form.',
    itemCount: 16,
  },
];

const Collections = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroScroll, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0]);

  return (
    <Layout>
      {/* Cinematic Full-Bleed Hero */}
      <section ref={heroRef} className="relative h-[85vh] min-h-[600px] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <img
            src={heroCollection}
            alt="Amby Luxe Collections"
            className="w-full h-[110%] object-cover"
          />
        </motion.div>

        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />

        {/* Decorative gold lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 flex items-center justify-center"
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
              Three distinct expressions of luxury, each with its own philosophy and aesthetic language.
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
      {collectionsMeta.map((collection, index) => (
        <CollectionShowcase key={collection.id} collection={collection} index={index} />
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
  collection: typeof collectionsMeta[0];
  index: number;
}

const CollectionShowcase = ({ collection, index }: CollectionShowcaseProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const isEven = index % 2 === 0;

  return (
    <section ref={ref} className="relative py-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        {/* Image Side */}
        <motion.div
          className={`relative overflow-hidden ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
        >
          <motion.img
            src={collection.image}
            alt={collection.name}
            className="w-full h-full object-cover min-h-[50vh] lg:min-h-full"
            style={{ y: imgY }}
          />
          <div className={`absolute inset-0 bg-gradient-to-${isEven ? 'r' : 'l'} from-transparent via-transparent to-background/80 hidden lg:block`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/20 lg:hidden" />
          
          {/* Collection number */}
          <div className={`absolute top-8 ${isEven ? 'left-8' : 'right-8'}`}>
            <span className="font-editorial text-8xl md:text-9xl font-light italic text-foreground/10">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        {/* Content Side */}
        <div className={`flex items-center ${isEven ? 'lg:order-2 lg:pl-16 xl:pl-24' : 'lg:order-1 lg:pr-16 xl:pr-24 lg:text-right'} px-8 py-16 lg:py-0`}>
          <motion.div
            initial={{ opacity: 0, x: isEven ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg"
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-primary/80 mb-6 block font-medium">
              {collection.tagline}
            </span>

            <h2 className="font-editorial text-6xl md:text-7xl lg:text-8xl font-light italic text-foreground mb-8 leading-[0.9]">
              {collection.name}
            </h2>

            <div className={`w-20 h-px bg-primary/40 mb-8 ${!isEven ? 'lg:ml-auto' : ''}`} />

            <p className="text-muted-foreground font-light text-base leading-[1.9] mb-10">
              {collection.longDescription}
            </p>

            <div className={`flex items-center gap-6 ${!isEven ? 'lg:justify-end' : ''}`}>
              <span className="text-[10px] text-muted-foreground/60 tracking-[0.3em] uppercase">
                {collection.itemCount} Pieces
              </span>
              <Link
                to={`/shop?collection=${collection.id}`}
                className="group/btn inline-flex items-center gap-3 text-sm text-primary font-medium tracking-[0.15em] uppercase hover:gap-5 transition-all duration-500"
              >
                Explore
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Separator line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
    </section>
  );
};

export default Collections;
