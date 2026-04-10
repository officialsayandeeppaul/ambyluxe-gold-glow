import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { listCustomerOrders, retrieveCustomerOrder } from '@/lib/medusa/orders';

/** Chunk size for infinite scroll — tuned for dense dashboard rows. */
const ORDERS_PAGE_SIZE = 24;

export function useInfiniteCustomerOrders(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['store-orders-infinite', ORDERS_PAGE_SIZE],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const res = await listCustomerOrders({
        limit: ORDERS_PAGE_SIZE,
        offset,
        order: '-created_at',
      });
      return {
        orders: res.orders,
        count: res.count ?? 0,
        offset,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.orders.length || lastPage.orders.length < ORDERS_PAGE_SIZE) {
        return undefined;
      }
      const next = lastPage.offset + ORDERS_PAGE_SIZE;
      if (lastPage.count > 0 && next >= lastPage.count) return undefined;
      return next;
    },
  });
}

export function useCustomerOrderDetail(orderId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['store-order', orderId],
    enabled: Boolean(orderId) && enabled,
    queryFn: async () => {
      const { order } = await retrieveCustomerOrder(orderId!);
      return order;
    },
  });
}

export { ORDERS_PAGE_SIZE };
