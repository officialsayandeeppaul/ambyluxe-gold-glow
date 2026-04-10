import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, LayoutDashboard, User } from 'lucide-react';

const medusaPublic = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
const medusaAdmin =
  import.meta.env.VITE_MEDUSA_ADMIN_URL?.replace(/\/$/, '') ||
  (medusaPublic ? `${medusaPublic}/app` : '');

const AdminDashboard = () => {
  const { user, profile, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate('/admin/login');
    else if (!isAdmin) navigate('/');
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-10">
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.35em] text-primary mb-4">
                <LayoutDashboard className="w-4 h-4" />
                Store hub
              </span>
              <h1 className="text-display-md font-display font-light">
                <span className="italic text-gold-gradient">Operations</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xl">
                Commerce data and inventory live in <strong>Medusa</strong>. Add your email to{' '}
                <code className="text-xs bg-muted/50 px-1 rounded">VITE_STORE_ADMIN_EMAILS</code> to access this hub.
              </p>
            </div>

            <div className="glass-card p-6 rounded-sm border border-border/40 mb-6 flex items-start gap-4">
              <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Signed in</p>
                <p className="font-medium">{user?.email}</p>
                {profile?.full_name && <p className="text-sm text-muted-foreground">{profile.full_name}</p>}
              </div>
            </div>

            <Link
              to="/admin/metadata-guide"
              className="glass-card p-6 rounded-sm border border-border/40 hover:border-primary/35 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 group"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Product metadata
                </p>
                <p className="font-display text-lg font-light">Fixed keys & curated rules</p>
                <p className="text-xs text-muted-foreground mt-1">
                  true/false, badges, homepage “Curated” — for non-technical editors
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary shrink-0">
                View guide
              </span>
            </Link>

            {medusaAdmin ? (
              <motion.a
                href={medusaAdmin}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-6 rounded-sm border border-primary/25 hover:border-primary/45 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Medusa Admin</p>
                  <p className="font-display text-lg font-light">Products, orders, inventory</p>
                  <p className="text-xs text-muted-foreground mt-1">{medusaAdmin}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary shrink-0">
                  Open
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set <code className="text-xs">VITE_MEDUSA_ADMIN_URL</code> (or rely on{' '}
                <code className="text-xs">VITE_MEDUSA_URL</code>/app).
              </p>
            )}

            {medusaPublic && (
              <p className="text-xs text-muted-foreground mt-6">
                Store API: <code className="text-xs">{medusaPublic}</code>
              </p>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
