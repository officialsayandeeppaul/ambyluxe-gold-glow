import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import lifestyleRings from '@/assets/lifestyle-rings.jpg';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    location: 'Mumbai',
    rating: 5,
    text: 'The Eternal Diamond Solitaire took my breath away. Every facet catches light in the most magical way. The craftsmanship is truly unparalleled.',
    purchase: 'Eternal Diamond Solitaire',
  },
  {
    id: 2,
    name: 'Ananya Kapoor',
    location: 'Delhi',
    rating: 5,
    text: 'I\'ve been collecting jewelry for years, and Amby Luxe pieces are in a league of their own. The Heritage collection speaks to my soul.',
    purchase: 'Royal Heritage Necklace',
  },
  {
    id: 3,
    name: 'Meera Reddy',
    location: 'Bangalore',
    rating: 5,
    text: 'My wedding jewellery from Amby Luxe made me feel like royalty. Every guest was mesmerized. Thank you for making my day absolutely magical.',
    purchase: 'Bridal Collection',
  },
];

export const Testimonials = () => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      {/* Background image with overlay - subtle */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10">
        <img 
          src={lifestyleRings}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-6">
              <span className="w-8 h-px bg-primary" />
              Testimonials
            </span>
            <h2 className="text-display-md font-display font-light mb-6">
              Stories of
              <br />
              <span className="italic text-gold-gradient">Treasured Moments</span>
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed max-w-md">
              Our greatest reward is the joy our creations bring to those who wear them. 
              Here's what our clients say about their Amby Luxe experience.
            </p>

            {/* Stats */}
            <div className="flex gap-12 mt-10">
              <div>
                <span className="block text-3xl font-display text-gold-gradient mb-1">4.9</span>
                <div className="flex gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Average Rating</span>
              </div>
              <div>
                <span className="block text-3xl font-display text-gold-gradient mb-1">10K+</span>
                <span className="text-xs text-muted-foreground">Happy Clients</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Testimonials */}
          <div className="space-y-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="glass-card p-6 md:p-8 rounded-sm relative group hover:border-primary/20 transition-colors"
              >
                <Quote className="absolute top-6 right-6 w-6 h-6 text-primary/15" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-foreground/80 font-light leading-relaxed mb-6 italic">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </div>
                  <span className="text-xs text-primary/60">
                    Purchased: {testimonial.purchase}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
