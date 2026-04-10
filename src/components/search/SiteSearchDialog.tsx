import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { searchProducts, hasSearchTokens } from '@/lib/catalogSearch';
import { productPath } from '@/lib/productUrl';
import { formatPrice } from '@/lib/products';

type SiteSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SiteSearchDialog({ open, onOpenChange }: SiteSearchDialogProps) {
  const navigate = useNavigate();
  const { data: products = [], isLoading, refetch } = useProducts();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const results = useMemo(() => {
    if (!hasSearchTokens(query)) return [];
    return searchProducts(products, query).slice(0, 8);
  }, [products, query]);

  const goShopAll = useCallback(() => {
    const q = query.trim();
    onOpenChange(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  }, [query, navigate, onOpenChange]);

  const goProduct = useCallback(
    (id: string) => {
      const p = products.find((x) => x.id === id);
      onOpenChange(false);
      setQuery('');
      if (p) navigate(productPath(p));
    },
    [products, navigate, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border/40 bg-background/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/20 space-y-1">
          <DialogTitle className="font-display text-xl tracking-tight pr-8">
            Search the boutique
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Names, materials, styles — try “gold hoop”, “pearl”, or a SKU.
          </p>
        </DialogHeader>
        <div className="p-4 pt-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jewellery…"
              className="pl-10 h-11 bg-background-elevated/50 border-border/55"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goShopAll();
                }
              }}
              aria-label="Search products"
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalogue…
            </p>
          ) : hasSearchTokens(query) ? (
            results.length ? (
              <ul className="max-h-[min(55vh,22rem)] overflow-y-auto divide-y divide-border/15 rounded-lg border border-border/25">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => goProduct(p.id)}
                      className="w-full flex gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted/30 shrink-0 border border-border/20">
                        <img
                          src={p.image}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          {formatPrice(p.price, p.currencyCode ?? 'INR')}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8 px-2">
                No quick matches. Press Enter to see all results on the shop page, or try another
                word.
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Type at least 2 letters (or a longer number).
            </p>
          )}
          <Button
            type="button"
            variant="luxuryOutline"
            className="w-full h-11"
            onClick={goShopAll}
          >
            {hasSearchTokens(query) ? `See all results for “${query.trim()}”` : 'Browse full shop'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
