import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { filterDistrictsForState } from '@/lib/indiaDistricts';
import type { InDistrictSuggestion } from '@/lib/medusa/storeSuggest';

type DistrictPickerProps = {
  district: string;
  stateProvince: string;
  onSuggestionPick: (s: InDistrictSuggestion) => void;
  disabled?: boolean;
};

/**
 * Districts for the selected state / UT (static India catalog — same idea as the state list).
 * Kept in its own file so it never shares scope with city search `loading` state (avoids HMR mix-ups).
 */
export function DistrictSearchCombobox({
  district,
  stateProvince,
  onSuggestionPick,
  disabled,
}: DistrictPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(district);

  const stateReady = stateProvince.trim().length > 0;

  const suggestions = useMemo((): InDistrictSuggestion[] => {
    if (!stateReady || !open) return [];
    return filterDistrictsForState(stateProvince.trim(), q);
  }, [stateReady, stateProvince, q, open]);

  useEffect(() => {
    if (!open) return;
    setQ(district);
  }, [open, district]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !stateReady}
          className="h-11 w-full justify-between font-normal border-border/55 bg-background-elevated/45 shadow-sm"
        >
          <span className={cn('truncate', !district && 'text-muted-foreground')}>
            {!stateReady
              ? 'Select state / UT first'
              : district || 'Search district (e.g. Bardhaman, Paschim)'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              stateReady ? 'Type to narrow, or scroll the full list…' : 'Choose state first'
            }
            value={q}
            onValueChange={setQ}
            disabled={!stateReady}
          />
          <CommandList>
            <CommandEmpty>
              {!stateReady
                ? 'Choose your state first.'
                : 'No district matches — try another spelling.'}
            </CommandEmpty>
            <CommandGroup heading="Districts (India)">
              {suggestions.map((s, i) => (
                <CommandItem
                  key={`${s.district}-${i}`}
                  value={s.label}
                  onSelect={() => {
                    onSuggestionPick(s);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      district === s.district ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="line-clamp-2">{s.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
