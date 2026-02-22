import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const BrandStory = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative py-32 md:py-48 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-dark" />
      
      {/* Decorative gold lines */}
      <motion.div
        style={{ y }}
        className="absolute top-20 left-10 w-px h-64 bg-gradient-to-b from-transparent via-primary/30 to-transparent"
      />
      <motion.div
        style={{ y: useTransform(y, (value) => -value) }}
        className="absolute bottom-20 right-10 w-px h-64 bg-gradient-to-b from-transparent via-primary/30 to-transparent"
      />

      {/* Radial glow */}
      <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20 blur-3xl" style={{
        background: 'radial-gradient(circle, hsl(43 74% 49% / 0.3), transparent 70%)'
      }} />

      <motion.div
        style={{ opacity }}
        className="container mx-auto px-6 relative z-10"
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-lg overflow-hidden border-gold-glow">
              <div className="w-full h-full bg-muted relative">
                {/* Placeholder for craftsmanship image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Craftsmanship Image</span>
                </div>
              </div>
            </div>
            
            {/* Floating accent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -bottom-8 -right-8 w-48 h-48 glass-card rounded-lg flex flex-col items-center justify-center text-center p-6"
            >
              <span className="text-4xl font-display text-gold-gradient">25+</span>
              <span className="text-sm text-muted-foreground mt-2">Years of Master Craftsmanship</span>
            </motion.div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="lg:pl-8"
          >
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary mb-4">
              Our Legacy
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold leading-tight mb-6">
              Crafted with
              <br />
              <span className="text-gold-gradient">Passion & Precision</span>
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Born from a legacy of master jewelers, Amby Luxe Jewels represents the pinnacle of Indian craftsmanship 
                merged with contemporary design sensibilities. Every piece that leaves our atelier carries the 
                weight of generations of expertise.
              </p>
              <p>
                Our artisans spend countless hours perfecting each creation, using only the finest ethically-sourced 
                gems and precious metals. From the initial sketch to the final polish, we obsess over every detail 
                to ensure your piece is nothing short of extraordinary.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-6">
              <div>
                <span className="block text-2xl font-display text-gold-gradient">100%</span>
                <span className="text-sm text-muted-foreground">Ethically Sourced</span>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <span className="block text-2xl font-display text-gold-gradient">GIA</span>
                <span className="text-sm text-muted-foreground">Certified Diamonds</span>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <span className="block text-2xl font-display text-gold-gradient">Lifetime</span>
                <span className="text-sm text-muted-foreground">Warranty</span>
              </div>
            </div>

            <div className="mt-10">
              <Link to="/about">
                <Button variant="luxuryOutline" size="lg">
                  Discover Our Story
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
