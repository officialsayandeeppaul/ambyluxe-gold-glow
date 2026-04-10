import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { ExternalLink, KeyRound } from 'lucide-react';

const medusaPublic = import.meta.env.VITE_MEDUSA_URL?.replace(/\/$/, '') ?? '';
const medusaAdmin =
  import.meta.env.VITE_MEDUSA_ADMIN_URL?.replace(/\/$/, '') ||
  (medusaPublic ? `${medusaPublic}/app` : '');

/** Explains Medusa Admin vs storefront store hub — no self-registration here. */
const AdminRegister = () => {
  return (
    <Layout>
      <section className="min-h-screen pt-28 pb-20 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg glass-card p-8 rounded-sm space-y-6"
        >
          <KeyRound className="w-10 h-10 mx-auto text-primary" />
          <h1 className="text-2xl font-display font-light text-center">Two different “admins”</h1>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">1. Medusa Admin</strong> (products, prices, orders) — open{' '}
              {medusaAdmin ? (
                <a
                  href={medusaAdmin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1"
                >
                  {medusaAdmin}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                'your Medusa URL /app'
              )}
              . Create that login once with{' '}
              <code className="text-xs bg-muted/50 px-1 rounded">npm run user:create</code> from the{' '}
              <code className="text-xs bg-muted/50 px-1 rounded">backend</code> folder. This is the main
              day-to-day tool for your team.
            </p>
            <p>
              <strong className="text-foreground">2. Store hub</strong> on this site (
              <code className="text-xs">/admin</code>) — lightweight links + metadata guide only. You sign in
              with a <strong>customer</strong> email (register under Customer sign in) and that email must
              appear in <code className="text-xs bg-muted/50 px-1 rounded">VITE_STORE_ADMIN_EMAILS</code> in
              the repo-root <code className="text-xs">.env</code>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/admin/login"
              className="text-center text-sm text-primary hover:underline"
            >
              ← Back to store hub sign in
            </Link>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default AdminRegister;
