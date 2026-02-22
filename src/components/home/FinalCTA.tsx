import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import heroCollection from '@/assets/hero-collection.jpg';

export const FinalCTA = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img 
          src={heroCollection}
          alt="Luxury jewelry collection"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      {/* Decorative circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/5 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/10 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-primary/15 rounded-full" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-3xl mx-auto text-center"
        >
          <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-8">
            <span className="w-12 h-px bg-primary" />
            Begin Your Journey
            <span className="w-12 h-px bg-primary" />
          </span>

          <h2 className="text-display-lg font-display font-light mb-8">
            Ready to Own
            <br />
            <span className="italic text-gold-gradient text-glow">Something Extraordinary?</span>
          </h2>

          <p className="text-lg text-muted-foreground font-light leading-relaxed mb-12 max-w-2xl mx-auto">
            Every Amby Luxe piece is a commitment to excellence—a treasure that will 
            be passed down through generations. Discover what makes us different.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/shop">
              <Button variant="hero" size="xl" className="group">
                Shop Collection
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="heroOutline" size="xl">
                Book Private Consultation
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Complimentary shipping worldwide • Lifetime warranty • 30-day returns
          </p>
        </motion.div>
      </div>
    </section>
  );
};
