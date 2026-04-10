import { medusa } from '@/integrations/medusa/client';

export type StoreNotification = {
  id: string;
  created_at: string;
  read_at: string | null;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export async function listStoreNotifications(params?: {
  unread?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ notifications: StoreNotification[]; count: number; unread_count: number }> {
  const query = new URLSearchParams();
  if (params?.unread) query.set('unread', 'true');
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));
  if (typeof params?.offset === 'number') query.set('offset', String(params.offset));
  const q = query.toString();
  const raw = await medusa.client.fetch(`/store/notifications${q ? `?${q}` : ''}`);
  return raw as { notifications: StoreNotification[]; count: number; unread_count: number };
}

export async function markStoreNotificationReadState(id: string, read: boolean): Promise<void> {
  await medusa.client.fetch(`/store/notifications/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: { read },
  });
}

export async function markAllStoreNotificationsRead(): Promise<void> {
  await medusa.client.fetch('/store/notifications', {
    method: 'POST',
    body: { action: 'mark_all_read' },
  });
}
