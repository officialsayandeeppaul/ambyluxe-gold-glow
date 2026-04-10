import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listStoreNotifications,
  markAllStoreNotificationsRead,
  markStoreNotificationReadState,
} from '@/lib/medusa/notifications';

const SUMMARY_QUERY_KEY = ['store-notifications-summary'] as const;
const INFINITE_QUERY_KEY = ['store-notifications-infinite', 20] as const;
const PAGE_SIZE = 20;

export function useStoreNotificationSummary(enabled: boolean) {
  return useQuery({
    queryKey: SUMMARY_QUERY_KEY,
    enabled,
    refetchInterval: enabled ? 20000 : false,
    queryFn: async () =>
      listStoreNotifications({
        limit: 1,
        offset: 0,
      }),
  });
}

export function useInfiniteStoreNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: INFINITE_QUERY_KEY,
    enabled,
    initialPageParam: 0,
    refetchInterval: enabled ? 20000 : false,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const res = await listStoreNotifications({
        limit: PAGE_SIZE,
        offset,
      });
      return {
        ...res,
        offset,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.notifications.length || lastPage.notifications.length < PAGE_SIZE) {
        return undefined;
      }
      const next = lastPage.offset + PAGE_SIZE;
      if (lastPage.count > 0 && next >= lastPage.count) return undefined;
      return next;
    },
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: INFINITE_QUERY_KEY }),
    ]);
  };

  const markOne = useMutation({
    mutationFn: async (input: { id: string; read: boolean }) => {
      await markStoreNotificationReadState(input.id, input.read);
    },
    onSuccess: refresh,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await markAllStoreNotificationsRead();
    },
    onSuccess: refresh,
  });

  return { markOne, markAll };
}
