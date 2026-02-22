import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import craftsmanship from '@/assets/craftsmanship.jpg';

export const CraftsmanshipSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative bg-background-elevated section-padding overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Image Side */}
          <motion.div 
            className="relative order-2 lg:order-1"
            style={{ y }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative"
            >
              {/* Main Image */}
              <div className="relative aspect-square overflow-hidden rounded-sm">
                <img 
                  src={craftsmanship}
                  alt="Master artisan crafting jewelry"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
              </div>

              {/* Floating Card */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute -bottom-8 -right-8 md:bottom-12 md:-right-12 glass-card p-6 md:p-8 rounded-sm max-w-xs"
              >
                <span className="block text-4xl md:text-5xl font-display text-gold-gradient mb-2">
                  500+
                </span>
                <span className="text-sm text-muted-foreground font-light">
                  Hours of meticulous work in every masterpiece
                </span>
              </motion.div>

              {/* Decorative Lines */}
              <div className="absolute top-0 left-0 w-24 h-px bg-gradient-to-r from-primary to-transparent" />
              <div className="absolute top-0 left-0 w-px h-24 bg-gradient-to-b from-primary to-transparent" />
              <div className="absolute bottom-0 right-0 w-24 h-px bg-gradient-to-l from-primary to-transparent" />
              <div className="absolute bottom-0 right-0 w-px h-24 bg-gradient-to-t from-primary to-transparent" />
            </motion.div>
          </motion.div>

          {/* Content Side */}
          <motion.div 
            className="order-1 lg:order-2"
            style={{ opacity }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-8">
                <span className="w-8 h-px bg-primary" />
                The Craft
              </span>

              <h2 className="text-display-md font-display font-light mb-8 leading-tight">
                Where Tradition
                <br />
                Meets <span className="italic text-gold-gradient">Mastery</span>
              </h2>

              <div className="space-y-6 text-muted-foreground font-light leading-relaxed mb-10">
                <p>
                  In our Mumbai atelier, time moves differently. Here, master craftsmen 
                  with decades of experience breathe life into precious metals, transforming 
                  raw materials into objects of desire.
                </p>
                <p>
                  Each piece begins as a vision—a sketch that captures the essence of 
                  elegance. From there, it journeys through countless hands, each adding 
                  their expertise: the gemologist who selects only the finest stones, the 
                  setter who positions each diamond with mathematical precision, the 
                  polisher who coaxes out the final, breathtaking gleam.
                </p>
                <p>
                  This is not mass production. This is <em className="text-foreground">art</em>.
                </p>
              </div>

              {/* Process Steps */}
              <div className="grid grid-cols-2 gap-6 mb-10">
                {[
                  { label: 'Design', desc: 'Conceptualized in Mumbai' },
                  { label: 'Source', desc: 'Ethically mined gems' },
                  { label: 'Craft', desc: 'Hand-finished details' },
                  { label: 'Perfect', desc: 'Quality certified' },
                ].map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="border-l border-primary/30 pl-4"
                  >
                    <span className="block text-sm font-medium text-foreground mb-1">
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {step.desc}
                    </span>
                  </motion.div>
                ))}
              </div>

              <Link to="/about">
                <Button variant="luxuryOutline" size="lg">
                  Discover Our Process
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
