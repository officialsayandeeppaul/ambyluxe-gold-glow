import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationActions, useStoreNotifications } from '@/hooks/useNotifications';
import { isMedusaConfigured } from '@/integrations/medusa/client';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true, state: { from: '/account/notifications' } });
  }, [authLoading, user, navigate]);

  const enabled = isMedusaConfigured() && Boolean(user) && !authLoading;
  const { data, isLoading, error, isError, refetch } = useStoreNotifications(enabled);
  const { markOne, markAll } = useNotificationActions();

  if (authLoading) {
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
      <section className="pt-28 md:pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.38em] text-primary/75 mb-2">Account center</p>
              <h1 className="text-4xl md:text-5xl font-display font-medium">
                Notifications{' '}
                <span className="text-base align-middle text-muted-foreground">
                  ({data?.unread_count ?? 0} unread)
                </span>
              </h1>
            </div>
            <Button
              type="button"
              variant="luxuryOutline"
              size="sm"
              disabled={markAll.isPending || (data?.unread_count ?? 0) === 0}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          </div>

          {isError && (
            <div className="mb-6 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
              <span>{error instanceof Error ? error.message : 'Could not load notifications.'}</span>
              <Button type="button" variant="luxuryOutline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (data?.notifications.length ?? 0) === 0 ? (
            <div className="rounded-sm border border-primary/20 bg-muted/10 p-8 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No notifications yet.</p>
              <Link to="/shop" className="inline-block mt-4">
                <Button variant="hero">Explore shop</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.notifications.map((n) => {
                const unread = !n.read_at;
                return (
                  <article
                    key={n.id}
                    className={`rounded-sm border p-4 md:p-5 transition-colors ${
                      unread
                        ? 'border-primary/35 bg-primary/[0.03]'
                        : 'border-border/40 bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm md:text-base font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mt-2">
                          {formatTime(n.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {unread ? (
                          <Button
                            type="button"
                            variant="luxuryOutline"
                            size="sm"
                            disabled={markOne.isPending}
                            onClick={() => markOne.mutate({ id: n.id, read: true })}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={markOne.isPending}
                            onClick={() => markOne.mutate({ id: n.id, read: false })}
                          >
                            Mark unread
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Notifications;
