import { useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useInfiniteStoreNotifications, useNotificationActions } from '@/hooks/useNotifications';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StoreNotification } from '@/lib/medusa/notifications';

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

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  enabled: boolean;
};

function metaString(notification: StoreNotification, key: string): string | null {
  const raw = notification.metadata?.[key];
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

export function NotificationsDrawer({ open, onOpenChange, enabled }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const query = useInfiniteStoreNotifications(enabled && open && isMedusaConfigured());
  const { markOne, markAll } = useNotificationActions();
  const [activeNotification, setActiveNotification] = useState<StoreNotification | null>(null);

  const notifications = useMemo(
    () => query.data?.pages.flatMap((p) => p.notifications) ?? [],
    [query.data?.pages],
  );
  const unreadCount = query.data?.pages[0]?.unread_count ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[450px] p-0 border-l border-primary/20 bg-background/95 backdrop-blur-xl"
      >
        <div className="h-full flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/30 text-left">
            <div className="flex items-center justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle className="font-display text-xl font-medium whitespace-nowrap truncate">
                  Notifications{' '}
                  <span className="text-sm text-muted-foreground font-sans">({unreadCount} unread)</span>
                </SheetTitle>
                <SheetDescription className="sr-only">Account activity feed</SheetDescription>
              </div>
              <Button
                type="button"
                variant="luxuryOutline"
                size="icon"
                className="h-8 w-8"
                disabled={markAll.isPending || unreadCount === 0}
                onClick={() => markAll.mutate()}
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            onScroll={() => {
              const el = scrollRef.current;
              if (!el || query.isFetchingNextPage || !query.hasNextPage) return;
              const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 180;
              if (nearBottom) void query.fetchNextPage();
            }}
          >
            {query.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-sm border border-primary/20 bg-muted/10 p-8 text-center mt-8">
                <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const unread = !n.read_at;
                return (
                  <article
                    key={n.id}
                    className={`rounded-sm border p-4 transition-colors ${
                      unread ? 'border-primary/35 bg-primary/[0.03]' : 'border-border/40 bg-background'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setActiveNotification(n);
                        if (unread) {
                          markOne.mutate({ id: n.id, read: true });
                        }
                      }}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                    </button>
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
                        {formatTime(n.created_at)}
                      </p>
                      {unread ? (
                        <Button
                          type="button"
                          variant="luxuryOutline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={markOne.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            markOne.mutate({ id: n.id, read: true });
                          }}
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          Read
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            {query.isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground uppercase tracking-wider">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading more...
              </div>
            )}
            {!query.hasNextPage && notifications.length > 0 && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 py-2">
                All notifications loaded
              </p>
            )}
          </div>
        </div>
      </SheetContent>

      <Dialog open={Boolean(activeNotification)} onOpenChange={(next) => !next && setActiveNotification(null)}>
        <DialogContent className="max-w-2xl bg-background border-border/40">
          {activeNotification && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{activeNotification.title}</DialogTitle>
                <DialogDescription>{formatTime(activeNotification.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="rounded-sm border border-border/40 p-3">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Notification</p>
                  <p>{activeNotification.body}</p>
                </div>

                {activeNotification.type === 'admin_reply' && (
                  <>
                    {metaString(activeNotification, 'contact_subject') && (
                      <div className="rounded-sm border border-border/40 p-3">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Issue subject</p>
                        <p>{metaString(activeNotification, 'contact_subject')}</p>
                      </div>
                    )}
                    {metaString(activeNotification, 'contact_message') && (
                      <div className="rounded-sm border border-border/40 p-3">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Your message</p>
                        <p className="whitespace-pre-wrap">{metaString(activeNotification, 'contact_message')}</p>
                      </div>
                    )}
                    {metaString(activeNotification, 'admin_note') && (
                      <div className="rounded-sm border border-primary/30 bg-primary/[0.03] p-3">
                        <p className="text-primary text-xs uppercase tracking-wider mb-1">Admin reply</p>
                        <p className="whitespace-pre-wrap">{metaString(activeNotification, 'admin_note')}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
