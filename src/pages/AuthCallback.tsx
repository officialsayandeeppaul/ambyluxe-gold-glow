import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { toast } from 'sonner';

export default function AuthCallback() {
  const { user, isLoading, completeOAuthCallback } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [working, setWorking] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (isLoading) return;
      const provider = searchParams.get('provider') || 'google';
      const query = Object.fromEntries(searchParams.entries());

      try {
        await completeOAuthCallback(provider, query);
        // After Google/phone OAuth success, user should be able to view/edit their profile.
        navigate('/account', { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to complete sign in.';
        toast.error(message);
        // If we couldn't auto-create the Medusa storefront customer (common after OAuth),
        // send the user to the signup page.
        const needsSignup = /need your email|account creation|finish account/i.test(message);
        navigate(needsSignup ? '/auth?signup=true' : '/auth', { replace: true });
      } finally {
        setWorking(false);
      }
    };
    void run();
  }, [completeOAuthCallback, isLoading, navigate, searchParams, user]);

  return (
    <Layout>
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {working ? 'Completing sign in...' : 'Redirecting...'}
          </p>
        </div>
      </section>
    </Layout>
  );
}
