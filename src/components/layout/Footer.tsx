import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

const footerLinks = {
  shop: [
    { name: 'All Collections', href: '/collections' },
    { name: 'Rings', href: '/shop?category=rings' },
    { name: 'Necklaces', href: '/shop?category=necklaces' },
    { name: 'Earrings', href: '/shop?category=earrings' },
    { name: 'Bracelets', href: '/shop?category=bracelets' },
    { name: 'Bangles', href: '/shop?category=bangles' },
  ],
  company: [
    { name: 'Our Story', href: '/about' },
    { name: 'Craftsmanship', href: '/about#craftsmanship' },
    { name: 'Sustainability', href: '/about#sustainability' },
    { name: 'Press', href: '/press' },
    { name: 'Careers', href: '/careers' },
  ],
  support: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQs', href: '/faqs' },
    { name: 'Shipping & Returns', href: '/shipping' },
    { name: 'Ring Size Guide', href: '/size-guide' },
    { name: 'Care Instructions', href: '/care' },
  ],
};

const socialLinks = [
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
];

export const Footer = () => {
  return (
    <footer className="bg-background-elevated border-t border-border/20">
      {/* Newsletter Section */}
      <div className="border-b border-border/20">
        <div className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-4">
                <span className="w-8 h-px bg-primary" />
                Newsletter
              </span>
              <h3 className="text-2xl md:text-3xl font-display font-light mb-3">
                Join the <span className="italic text-gold-gradient">Inner Circle</span>
              </h3>
              <p className="text-muted-foreground font-light text-sm">
                Be the first to discover new collections, exclusive offers, and the artistry behind our creations.
              </p>
            </div>
            <div>
              <form className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 bg-background border border-border/50 rounded-sm px-5 py-4 text-sm font-light placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-primary/90 transition-colors rounded-sm flex items-center gap-2"
                >
                  Subscribe
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <span className="text-lg font-display font-light tracking-[0.2em] text-gold-gradient">
                AMBY LUXE
              </span>
              <span className="block text-[9px] uppercase tracking-[0.5em] text-primary/60 mt-0.5">
                Jewels
              </span>
            </Link>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed font-light">
              Crafting timeless elegance since 1998. Every piece tells a story of artistry, heritage, and enduring beauty.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] mb-6 text-foreground">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] mb-6 text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] mb-6 text-foreground">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h4 className="text-xs font-medium uppercase tracking-[0.2em] mb-6 text-foreground">Visit Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-xs text-muted-foreground font-light">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <span>123 Luxury Lane, Bandra West<br />Mumbai 400050</span>
              </li>
              <li>
                <a
                  href="tel:+919876543210"
                  className="flex items-center space-x-3 text-xs text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>+91 98765 43210</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@ambyluxe.com"
                  className="flex items-center space-x-3 text-xs text-muted-foreground hover:text-primary transition-colors font-light"
                >
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>hello@ambyluxe.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/20">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground font-light">
              © {new Date().getFullYear()} Amby Luxe Jewels. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link to="/privacy" className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-light">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-light">
                Terms of Service
              </Link>
              <Link to="/refunds" className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-light">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
