import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/lib/store';
import { staticProducts } from '@/lib/products';
import { fetchMedusaProductLookup, fetchMedusaProducts } from '@/lib/medusa/products';
import { slugifyProductSegment } from '@/lib/productUrl';
import { isMedusaConfigured } from '@/integrations/medusa/client';

/** Demo JSON only when Medusa URL/key are missing. */
const STATIC_STALE_MS = 300_000;

export function useProducts() {
  const medusaOn = isMedusaConfigured();
  return useQuery({
    queryKey: ['products', medusaOn ? 'medusa' : 'static'],
    queryFn: async (): Promise<Product[]> => {
      if (!medusaOn) {
        return staticProducts;
      }
      return fetchMedusaProducts();
    },
    staleTime: medusaOn ? 0 : STATIC_STALE_MS,
    gcTime: 10 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

function productMatchesLookup(p: Product, lookupKey: string): boolean {
  if (p.id === lookupKey) return true;
  const norm = slugifyProductSegment(lookupKey);
  const h = p.handle?.trim();
  if (h) {
    if (slugifyProductSegment(h) === norm || h.toLowerCase() === lookupKey.trim().toLowerCase()) {
      return true;
    }
  }
  const n = p.name?.trim();
  if (n) {
    if (slugifyProductSegment(n) === norm || n.toLowerCase() === lookupKey.trim().toLowerCase()) {
      return true;
    }
  }
  return false;
}

/**
 * Single product for PDP — id (`prod_…`) or handle slug from `/products/:handle`.
 */
export function useProduct(lookupKey: string | undefined) {
  const listQuery = useProducts();
  const detailQuery = useQuery({
    queryKey: ['product', lookupKey, 'medusa'],
    queryFn: () => fetchMedusaProductLookup(lookupKey!),
    enabled: Boolean(lookupKey && isMedusaConfigured()),
    staleTime: isMedusaConfigured() ? 0 : STATIC_STALE_MS,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const product = useMemo((): Product | undefined => {
    if (!lookupKey) return undefined;
    if (isMedusaConfigured()) {
      return (
        detailQuery.data ?? listQuery.data?.find((p) => productMatchesLookup(p, lookupKey))
      );
    }
    return (
      listQuery.data?.find((p) => productMatchesLookup(p, lookupKey)) ??
      staticProducts.find((p) => productMatchesLookup(p, lookupKey))
    );
  }, [lookupKey, isMedusaConfigured, detailQuery.data, listQuery.data]);

  const isLoading = useMemo(() => {
    if (!lookupKey) return false;
    if (!isMedusaConfigured()) {
      const hit =
        listQuery.data?.some((p) => productMatchesLookup(p, lookupKey)) ||
        staticProducts.some((p) => productMatchesLookup(p, lookupKey));
      return listQuery.isLoading && !hit;
    }
    const fromList = listQuery.data?.some((p) => productMatchesLookup(p, lookupKey));
    if (detailQuery.data || fromList) return false;
    return detailQuery.isPending || listQuery.isLoading;
  }, [
    lookupKey,
    isMedusaConfigured,
    detailQuery.data,
    detailQuery.isPending,
    listQuery.data,
    listQuery.isLoading,
  ]);

  return {
    ...listQuery,
    product,
    isLoading,
    isReady: !isLoading && Boolean(product),
    /** Full catalogue for related / filters */
    allProducts: listQuery.data ?? [],
  };
}

const DEFAULT_FEATURED = 5;

/**
 * Curated strip (homepage + PDP): Metadata `featured` / `featured_order`, else bestsellers.
 */
export function useFeaturedProducts(limit: number = DEFAULT_FEATURED) {
  const { data: productList = [], isLoading } = useProducts();
  const data = useMemo(() => {
    const featured = productList
      .filter((p) => p.featured)
      .sort((a, b) => (a.featuredRank ?? 999) - (b.featuredRank ?? 999));
    if (featured.length) return featured.slice(0, limit);
    return productList
      .filter((p) => p.isBestseller)
      .sort((a, b) => (a.featuredRank ?? 999) - (b.featuredRank ?? 999))
      .slice(0, limit);
  }, [productList, limit]);

  const fallback = useMemo(() => productList.slice(0, limit), [productList, limit]);

  return {
    data: data.length ? data : fallback,
    isLoading,
  };
}
