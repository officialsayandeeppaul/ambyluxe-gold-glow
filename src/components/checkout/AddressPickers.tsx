import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import { filterStates } from '@/data/indiaStatesAndUts';
import {
  fetchIndiaLocationSuggestions,
  type InLocationSuggestion,
} from '@/lib/medusa/storeSuggest';

type StatePickerProps = {
  value: string;
  onChange: (state: string) => void;
  disabled?: boolean;
};

export function StateSearchCombobox({ value, onChange, disabled }: StatePickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => filterStates(q), [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-11 w-full justify-between font-normal border-border/55 bg-background-elevated/45 shadow-sm"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || 'Search or select state / UT'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to filter states…"
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            <CommandEmpty>No state matches.</CommandEmpty>
            <CommandGroup>
              {filtered.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => {
                    onChange(s);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === s ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type CityPickerProps = {
  city: string;
  /** Selected state / UT — required before city search runs with useful bias. */
  stateProvince: string;
  /** District chosen in step 2 — tightens city results. */
  district?: string;
  /**
   * When true, city stays disabled until `district` is non-empty.
   * @default false
   */
  requireDistrict?: boolean;
  onCityChange: (c: string) => void;
  onSuggestionPick: (s: InLocationSuggestion) => void;
  disabled?: boolean;
  /**
   * When false, city can only be set from the suggestion list (stricter delivery addresses).
   * @default true
   */
  allowFreeTextCity?: boolean;
};

export function CitySearchCombobox({
  city,
  stateProvince,
  district = '',
  requireDistrict = false,
  onCityChange,
  onSuggestionPick,
  disabled,
  allowFreeTextCity = true,
}: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(city);
  const [citySuggestLoading, setCitySuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<InLocationSuggestion[]>([]);

  const stateReady = stateProvince.trim().length > 0;
  const districtTrim = district.trim();
  const areaReady =
    stateReady && (!requireDistrict || districtTrim.length > 0);

  useEffect(() => {
    if (!open) return;
    setQ(city);
  }, [open, city]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!areaReady || term.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setCitySuggestLoading(true);
      try {
        const rows = await fetchIndiaLocationSuggestions(term, {
          stateProvince: stateProvince.trim(),
          district: districtTrim || undefined,
        });
        if (!cancelled) setSuggestions(rows);
      } finally {
        if (!cancelled) setCitySuggestLoading(false);
      }
    }, 380);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, open, areaReady, stateProvince, districtTrim]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !areaReady}
          className="h-11 w-full justify-between font-normal border-border/55 bg-background-elevated/45 shadow-sm"
        >
          <span className={cn('truncate', !city && 'text-muted-foreground')}>
            {!stateReady
              ? 'Select state / UT first'
              : requireDistrict && !districtTrim
                ? 'Select district first'
                : city || 'Search city or area (India)'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              !stateReady
                ? 'Choose state first'
                : requireDistrict && !districtTrim
                  ? 'Choose district first'
                  : 'Type at least 2 characters…'
            }
            value={q}
            onValueChange={setQ}
            disabled={!areaReady}
          />
          <CommandList>
            {citySuggestLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {!stateReady
                    ? 'Choose your state or union territory above.'
                    : requireDistrict && !districtTrim
                      ? 'Choose your district above, then search for a city or town.'
                      : q.trim().length < 2
                        ? 'Keep typing to search OpenStreetMap (India), biased to state and district.'
                        : allowFreeTextCity
                          ? 'No matches — you can still use your text as city.'
                          : 'No close match — try a nearby town or different spelling; you must pick a suggestion.'}
                </CommandEmpty>
                <CommandGroup heading="Suggestions">
                  {suggestions.map((s, i) => (
                    <CommandItem
                      key={`${s.label}-${i}`}
                      value={s.label}
                      onSelect={() => {
                        onSuggestionPick(s);
                        setOpen(false);
                      }}
                    >
                      <span className="line-clamp-2">{s.label}</span>
                    </CommandItem>
                  ))}
                  {allowFreeTextCity && areaReady && q.trim().length >= 2 ? (
                    <CommandItem
                      value="__use_typed__"
                      onSelect={() => {
                        onCityChange(q.trim());
                        setOpen(false);
                      }}
                    >
                      Use “{q.trim()}” as city
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
