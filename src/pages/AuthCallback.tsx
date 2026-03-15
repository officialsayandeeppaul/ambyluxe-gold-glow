import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';

/** Handles OAuth redirects - Supabase parses hash from URL and sets session */
export default function AuthCallback() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate(user ? '/' : '/auth', { replace: true });
  }, [user, isLoading, navigate]);

  return (
    <Layout>
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Completing sign in...</p>
        </div>
      </section>
    </Layout>
  );
}
