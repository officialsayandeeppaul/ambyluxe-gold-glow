import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, Gem, Heart, Sparkles } from 'lucide-react';

const values = [
  {
    icon: Gem,
    title: 'Exceptional Craftsmanship',
    description: 'Each piece is meticulously handcrafted by master artisans with decades of experience, ensuring unparalleled quality and attention to detail.',
  },
  {
    icon: Heart,
    title: 'Ethically Sourced',
    description: 'We are committed to responsible sourcing, working only with suppliers who share our values of sustainability and ethical mining practices.',
  },
  {
    icon: Award,
    title: 'GIA Certified',
    description: 'All our diamonds and precious gems come with GIA certification, guaranteeing authenticity, quality, and value for our discerning clients.',
  },
  {
    icon: Sparkles,
    title: 'Timeless Design',
    description: 'Our designs blend traditional artistry with contemporary aesthetics, creating pieces that transcend trends and become cherished heirlooms.',
  },
];

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse at 30% 50%, hsl(43 74% 49% / 0.2), transparent 60%)'
        }} />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block text-xs uppercase tracking-[0.4em] text-primary mb-6">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold leading-tight mb-8">
              A Legacy of
              <br />
              <span className="text-gold-gradient">Timeless Beauty</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              For over two decades, Amby Luxe Jewels has been at the forefront of luxury jewelry craftsmanship, 
              creating masterpieces that celebrate life's most precious moments.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-background-elevated">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="aspect-[4/5] rounded-lg overflow-hidden border-gold-glow bg-muted">
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Founder Image
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary mb-4">
                Our Beginning
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
                Born from <span className="text-gold-gradient">Passion</span>
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  Amby Luxe Jewels was founded in 1998 by master jeweler Amrita Bhargava, 
                  whose vision was to create jewelry that would be cherished for generations. 
                  Growing up in a family of traditional goldsmiths in Jaipur, she learned the 
                  ancient techniques that would become the foundation of our craft.
                </p>
                <p>
                  Today, we continue that legacy, combining time-honored artisanal methods 
                  with innovative design to create pieces that are both contemporary and timeless. 
                  Every Amby Luxe creation tells a story – one of heritage, craftsmanship, and 
                  the enduring beauty of fine jewelry.
                </p>
                <p>
                  Our atelier in Mumbai brings together the finest craftsmen, designers, and 
                  gemologists, all united by a shared passion for excellence and an unwavering 
                  commitment to creating extraordinary jewelry.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary mb-4">
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold">
              Our <span className="text-gold-gradient">Values</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-card p-8 rounded-lg text-center group hover-lift"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-primary/30 flex items-center justify-center group-hover:border-primary/60 transition-colors">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-4">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background-elevated relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse at center, hsl(43 74% 49% / 0.15), transparent 70%)'
        }} />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
              Begin Your <span className="text-gold-gradient">Journey</span>
            </h2>
            <p className="text-muted-foreground mb-10">
              Discover the Amby Luxe difference and find the perfect piece to celebrate your story.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/collections">
                <Button variant="hero" size="xl">
                  Explore Collections
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="heroOutline" size="xl">
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
