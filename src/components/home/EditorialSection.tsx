import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import lifestyleRings from '@/assets/lifestyle-rings.jpg';
import modelNecklace from '@/assets/model-necklace.jpg';

export const EditorialSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);

  return (
    <section ref={containerRef} className="relative section-padding overflow-hidden">
      {/* Background gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(42 78% 52% / 0.2), transparent 60%)' }}
      />

      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-6">
            <span className="w-8 h-px bg-primary" />
            The Art of Adornment
            <span className="w-8 h-px bg-primary" />
          </span>
          <h2 className="text-display-md font-display font-light mb-6">
            Pieces That Tell
            <br />
            <span className="italic text-gold-gradient">Your Story</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Every curve, every facet, every gleaming surface is a testament to the countless 
            hours of meticulous craftsmanship that goes into creating something truly extraordinary.
          </p>
        </motion.div>

        {/* Editorial Grid - Asymmetric Layout */}
        <div className="grid grid-cols-12 gap-6 md:gap-8 items-center">
          {/* Left Image - Large */}
          <motion.div 
            className="col-span-12 md:col-span-7 relative"
            style={{ y: y1 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative aspect-[4/5] overflow-hidden rounded-sm"
            >
              <img 
                src={lifestyleRings}
                alt="Elegant hands wearing diamond rings"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              
              {/* Floating text overlay */}
              <div className="absolute bottom-8 left-8 right-8">
                <span className="text-xs uppercase tracking-[0.3em] text-primary mb-2 block">Signature Collection</span>
                <h3 className="text-2xl md:text-3xl font-display font-light text-foreground">
                  The Poetry of<br />
                  <span className="italic">Precious Metals</span>
                </h3>
              </div>
            </motion.div>

            {/* Decorative frame */}
            <div className="absolute -inset-4 border border-primary/10 rounded-sm pointer-events-none" />
          </motion.div>

          {/* Right Column - Stacked */}
          <div className="col-span-12 md:col-span-5 space-y-8">
            {/* Quote Block */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="glass-card p-8 md:p-10 rounded-sm"
            >
              <blockquote className="text-xl md:text-2xl font-display font-light leading-relaxed text-foreground/90 mb-6">
                "True luxury is not about price—it's about the story, the craft, and the 
                <span className="text-gold-gradient italic"> emotion</span> it evokes."
              </blockquote>
              <cite className="not-italic text-sm text-muted-foreground">
                — Amrita Bhargava, Founder
              </cite>
            </motion.div>

            {/* Second Image */}
            <motion.div 
              className="relative"
              style={{ y: y2, rotate }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="relative aspect-portrait overflow-hidden rounded-sm"
              >
                <img 
                  src={modelNecklace}
                  alt="Elegant woman wearing gold necklace"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Feature Text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-24 grid md:grid-cols-3 gap-8 md:gap-12"
        >
          {[
            {
              number: '01',
              title: 'Master Artisans',
              description: 'Each piece is handcrafted by artisans who have dedicated over two decades to perfecting their craft.'
            },
            {
              number: '02', 
              title: 'Rare Gemstones',
              description: 'We source only the finest, ethically-mined gemstones from trusted mines across the globe.'
            },
            {
              number: '03',
              title: 'Timeless Design',
              description: 'Our designs blend heritage techniques with contemporary aesthetics for enduring beauty.'
            }
          ].map((item, i) => (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group"
            >
              <span className="block text-5xl font-display text-primary/20 mb-4 group-hover:text-primary/40 transition-colors">
                {item.number}
              </span>
              <h4 className="text-lg font-display mb-3 text-foreground">
                {item.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
