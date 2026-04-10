import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield, ExternalLink, Store } from 'lucide-react';

const medusaPublic = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
const medusaAdmin =
  import.meta.env.VITE_MEDUSA_ADMIN_URL?.replace(/\/$/, '') ||
  (medusaPublic ? `${medusaPublic}/app` : '');

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  const allowedHubEmails = useMemo(() => {
    const raw = import.meta.env.VITE_STORE_ADMIN_EMAILS ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await signIn(email, password, { variant: 'admin' });
      if (ok) navigate('/admin');
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="min-h-screen pt-28 pb-20 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-primary mb-4">
              <Shield className="w-3 h-3" aria-hidden />
              Staff
            </span>
            <h1 className="text-3xl md:text-4xl font-display font-light">
              How do you want to <span className="italic text-gold-gradient">work?</span>
            </h1>
          </div>

          {/* Medusa Admin — full catalogue (what most people mean by “admin”) */}
          {medusaAdmin && (
            <div className="glass-card p-6 rounded-sm border border-primary/30 space-y-3">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-1">
                    Full backend (recommended)
                  </p>
                  <p className="text-sm font-medium">Medusa Admin — products, orders, inventory</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Use the email and password you created with{' '}
                    <code className="text-[10px] bg-muted/50 px-1 rounded">npm run user:create</code> in
                    the <code className="text-[10px] bg-muted/50 px-1 rounded">backend</code> folder.
                    That login works only here — not in the form below.
                  </p>
                </div>
              </div>
              <Button variant="hero" size="lg" className="w-full gap-2" asChild>
                <a href={medusaAdmin} target="_blank" rel="noopener noreferrer">
                  Open Medusa Admin
                  <ExternalLink className="w-4 h-4" aria-hidden />
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">{medusaAdmin}</p>
            </div>
          )}

          {/* Storefront hub — customer login + allowlist */}
          <div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-display font-light">Store hub on this website</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Shortcuts and the metadata guide live here. Sign in with a{' '}
                <strong>shop customer</strong> account (same as “Customer sign in”), and your email must
                be listed in <code className="text-xs bg-muted/50 px-1 rounded">VITE_STORE_ADMIN_EMAILS</code>{' '}
                in the project <code className="text-xs bg-muted/50 px-1 rounded">.env</code>.
              </p>
              {allowedHubEmails.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-3">
                  Allowed for this hub:{' '}
                  <span className="text-foreground font-mono">{allowedHubEmails.join(', ')}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-600/90 mt-3">
                  No emails configured — add <code className="text-[10px]">VITE_STORE_ADMIN_EMAILS</code> in{' '}
                  <code className="text-[10px]">.env</code> (restart Vite after saving).
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="glass-card p-8 rounded-sm space-y-5"
              autoComplete="on"
            >
              <div className="space-y-2">
                <Label htmlFor="admin-login-email" className="text-xs uppercase tracking-wider">
                  Customer email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                  <Input
                    id="admin-login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background/50 border-border/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-login-password" className="text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                  <Input
                    id="admin-login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/50 border-border/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="luxury" size="lg" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in to store hub'}
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                No account yet?{' '}
                <Link to="/auth" className="text-primary hover:underline">
                  Register as a customer
                </Link>{' '}
                (use an email that you add to <code className="text-[10px]">VITE_STORE_ADMIN_EMAILS</code>).
              </p>
              <p className="text-center text-xs">
                <Link to="/auth" className="text-muted-foreground hover:text-primary">
                  Customer sign in
                </Link>
                {' · '}
                <Link to="/admin/register" className="text-muted-foreground hover:text-primary">
                  Two admins explained
                </Link>
              </p>
            </form>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default AdminLogin;
