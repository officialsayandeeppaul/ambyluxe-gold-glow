import { motion } from 'framer-motion';
import { Diamond } from 'lucide-react';

const brandValues = [
  'Exceptional Craftsmanship',
  'Ethically Sourced',
  'GIA Certified',
  'Lifetime Warranty',
  'Free Worldwide Shipping',
  'Bespoke Designs',
  'Handcrafted Excellence',
  'Conflict-Free Diamonds',
  'Royal Heritage',
  'Custom Engraving',
  'Certified Artisans',
  'Timeless Design',
];

export const MarqueeSection = () => {
  // Duplicate array for seamless loop
  const items = [...brandValues, ...brandValues];

  return (
    <section className="relative py-10 md:py-14 overflow-hidden bg-background-elevated">
      {/* Top & bottom gold accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Radial gold glow — pulsing */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(42 78% 52% / 0.08), transparent 60%)',
        }}
      />

      {/* Corner ornaments */}
      <div className="absolute top-3 left-5 w-8 h-8 border-t border-l border-primary/15" />
      <div className="absolute top-3 right-5 w-8 h-8 border-t border-r border-primary/15" />
      <div className="absolute bottom-3 left-5 w-8 h-8 border-b border-l border-primary/15" />
      <div className="absolute bottom-3 right-5 w-8 h-8 border-b border-r border-primary/15" />

      {/* Single scrolling row */}
      <div className="flex whitespace-nowrap">
        <motion.div
          className="flex"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        >
          {items.map((value, index) => (
            <div key={index} className="flex items-center gap-8 md:gap-12 px-4 md:px-6">
              <span className="text-xs md:text-sm font-editorial font-light italic tracking-[0.2em] text-foreground/70 uppercase">
                {value}
              </span>
              <Diamond className="w-2.5 h-2.5 text-primary/50 fill-primary/20 flex-shrink-0" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
