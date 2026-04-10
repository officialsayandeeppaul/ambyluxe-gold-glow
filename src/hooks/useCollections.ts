import { useQuery } from '@tanstack/react-query';
import {
  fetchMedusaShowcaseCollections,
  getStaticShowcaseCollections,
  type ShowcaseCollection,
  type ShowcaseCollectionScope,
} from '@/lib/medusa/collections';
import { isMedusaConfigured } from '@/integrations/medusa/client';

/** Match `useProducts`: fast refresh in dev, 1 min cache in prod. */
const CATALOG_STALE_MS = import.meta.env.DEV ? 0 : 60_000;

export function useShowcaseCollections(scope: ShowcaseCollectionScope = 'all') {
  return useQuery({
    queryKey: ['collections', 'showcase', scope, isMedusaConfigured() ? 'medusa' : 'static'],
    queryFn: async (): Promise<ShowcaseCollection[]> => {
      if (!isMedusaConfigured()) {
        return getStaticShowcaseCollections();
      }
      try {
        return await fetchMedusaShowcaseCollections(scope);
      } catch {
        return getStaticShowcaseCollections();
      }
    },
    staleTime: CATALOG_STALE_MS,
    refetchOnWindowFocus: true,
  });
}
