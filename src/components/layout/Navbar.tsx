import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, Heart, User, Search, LogIn } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { name: 'Collections', href: '/collections' },
  { name: 'Shop', href: '/shop' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const cartCount = useStore((state) => state.cartCount());
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          isScrolled
            ? 'bg-background/90 backdrop-blur-xl border-b border-border/30 py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6">
          <nav className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="lg:hidden text-foreground/80 hover:text-primary transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Left Navigation - Desktop */}
            <div className="hidden lg:flex items-center space-x-10">
              {navLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="relative text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-primary transition-colors duration-300 group font-medium"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Logo */}
            <Link to="/" className="flex flex-col items-center group">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <span className="text-xl md:text-2xl font-display font-light tracking-[0.2em] text-gold-gradient">
                  AMBY LUXE
                </span>
                <span className="block text-[9px] uppercase tracking-[0.5em] text-primary/60 mt-0.5 font-body font-light">
                  Jewels
                </span>
              </motion.div>
            </Link>

            {/* Right Navigation - Desktop */}
            <div className="hidden lg:flex items-center space-x-10">
              {navLinks.slice(2).map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="relative text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-primary transition-colors duration-300 group font-medium"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-5">
              <button className="hidden md:block text-foreground/60 hover:text-primary transition-colors">
                <Search className="h-4 w-4" />
              </button>
              {!isLoading && (
                user ? (
                  <Link
                    to="/account"
                    className="hidden md:flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="hidden md:flex items-center gap-1 text-xs uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                )
              )}
              <Link
                to="/wishlist"
                className="hidden md:block text-foreground/60 hover:text-primary transition-colors"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <Link
                to="/cart"
                className="relative text-foreground/60 hover:text-primary transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-[9px] font-medium bg-primary text-primary-foreground rounded-full"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </Link>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-xl z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 left-0 h-full w-80 bg-background border-r border-border/30 z-50"
            >
              <div className="p-8">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 text-foreground/60 hover:text-primary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Logo */}
                <div className="mb-12">
                  <span className="text-lg font-display font-light tracking-[0.2em] text-gold-gradient">
                    AMBY LUXE
                  </span>
                </div>

                <div className="space-y-6">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        to={link.href}
                        className="block text-2xl font-display font-light tracking-wide text-foreground/80 hover:text-primary transition-colors"
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}

                  <div className="divider-gold my-8" />

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4"
                  >
                    <Link
                      to="/account"
                      className="flex items-center space-x-3 text-foreground/60 hover:text-primary transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm font-light">My Account</span>
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center space-x-3 text-foreground/60 hover:text-primary transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      <span className="text-sm font-light">Wishlist</span>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
