import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  CURATED_HELP,
  PRODUCT_METADATA_KEYS,
} from '@/lib/medusa/productMetadataKeys';

const medusaAdmin =
  import.meta.env.VITE_MEDUSA_ADMIN_URL?.replace(/\/$/, '') ||
  (import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '')
    ? `${import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '')}/app`
    : '');

const AdminMetadataGuide = () => {
  const { user, isAdmin, isLoading } = useAuth();
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
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to hub
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-primary mb-4">
              <BookOpen className="w-4 h-4" />
              For your team
            </span>
            <h1 className="text-display-sm font-display font-light mb-4">
              Product metadata — fixed keys
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-2xl">
              <strong className="text-foreground">Easiest:</strong> In Medusa Admin → Products → open a
              product. At the <strong>top</strong> of the page, use the panel{' '}
              <strong>Amby Luxe — website fields</strong> (toggles + inputs). You do not type metadata
              keys there — only values.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-2xl">
              If you use the generic <strong>Metadata</strong> editor instead, use only the keys in the
              table below; for on/off type{' '}
              <code className="text-xs bg-muted/60 px-1 rounded">true</code> or{' '}
              <code className="text-xs bg-muted/60 px-1 rounded">false</code>.
            </p>

            {medusaAdmin && (
              <p className="text-sm mb-10">
                <a
                  href={`${medusaAdmin}/products`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open Medusa → Products
                </a>
              </p>
            )}

            <div className="glass-card p-5 rounded-sm border border-primary/20 mb-10">
              <p className="text-[10px] uppercase tracking-wider text-primary mb-2">Curated</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{CURATED_HELP}</p>
            </div>

            <div className="overflow-x-auto rounded-sm border border-border/40">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="p-3 font-semibold w-36">Key</th>
                    <th className="p-3 font-semibold">Label</th>
                    <th className="p-3 font-semibold w-24">Type</th>
                    <th className="p-3 font-semibold min-w-[200px]">What it does on the site</th>
                    <th className="p-3 font-semibold min-w-[160px]">Example value</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCT_METADATA_KEYS.map((row) => (
                    <tr key={row.key} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="p-3 font-mono text-xs text-primary">{row.key}</td>
                      <td className="p-3">{row.label}</td>
                      <td className="p-3 text-muted-foreground">{row.type}</td>
                      <td className="p-3 text-muted-foreground">{row.storefront}</td>
                      <td className="p-3 font-mono text-xs break-all">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
              Remove random test keys (e.g. numbers like <code className="text-xs">7787</code>) —
              they are ignored by the storefront. JSON fields must be valid JSON if you use
              brackets.
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AdminMetadataGuide;
