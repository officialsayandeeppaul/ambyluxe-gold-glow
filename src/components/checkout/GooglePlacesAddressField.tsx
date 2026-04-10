import { useCallback, useEffect, useId, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { matchIndiaStateLabel } from '@/data/indiaStatesAndUts';
import { normalizeAddressWhitespace } from '@/lib/indiaAddressValidation';
import { cn } from '@/lib/utils';

export type ResolvedIndianAddress = {
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
};

let mapsLoader: Promise<void> | null = null;

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    const id = 'google-maps-places-sdk';
    if (document.getElementById(id)) {
      const t = window.setInterval(() => {
        if (window.google?.maps?.places) {
          window.clearInterval(t);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(t);
        reject(new Error('Google Maps load timeout'));
      }, 20_000);
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps script failed'));
    document.head.appendChild(s);
  });
  return mapsLoader;
}

function longName(c: google.maps.GeocoderAddressComponent | undefined): string {
  return c?.long_name?.trim() ?? '';
}

function parsePlaceToIndianAddress(
  place: google.maps.places.PlaceResult,
): ResolvedIndianAddress | null {
  const comps = place.address_components;
  if (!comps?.length) return null;

  const byType = (t: string) => comps.find((c) => c.types.includes(t));

  const streetNumber = longName(byType('street_number'));
  const route = longName(byType('route'));
  const premise = longName(byType('premise'));
  const subpremise = longName(byType('subpremise'));
  const neighborhood = longName(byType('neighborhood'));
  const subloc1 = longName(byType('sublocality_level_1')) || longName(byType('sublocality'));
  const subloc2 = longName(byType('sublocality_level_2'));
  const locality =
    longName(byType('locality')) ||
    longName(byType('administrative_area_level_3')) ||
    longName(byType('administrative_area_level_2'));
  const admin1 = longName(byType('administrative_area_level_1'));
  const postal = longName(byType('postal_code')).replace(/\D/g, '').slice(0, 6);

  const doorStreet = normalizeAddressWhitespace(
    [streetNumber, route].filter(Boolean).join(' '),
  );
  const block1 = normalizeAddressWhitespace(
    [premise, subpremise, doorStreet || subloc2, subloc1, neighborhood]
      .filter(Boolean)
      .join(', '),
  );
  const address1 =
    block1.length >= 8
      ? block1
      : normalizeAddressWhitespace(place.formatted_address ?? '').split(',').slice(0, 2).join(', ');

  if (!address1 || address1.length < 8) return null;

  const city = locality || subloc1 || normalizeAddressWhitespace(admin1);
  if (!city) return null;

  const province = matchIndiaStateLabel(admin1);
  if (!province || !postal || postal.length !== 6) return null;

  const address2 = normalizeAddressWhitespace(
    [subpremise && !address1.includes(subpremise) ? subpremise : '', neighborhood]
      .filter(Boolean)
      .join(', '),
  );

  return {
    address1,
    address2,
    city,
    province,
    postalCode: postal,
  };
}

type Props = {
  apiKey: string;
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onResolved: (resolved: ResolvedIndianAddress) => void;
  onVerifiedChange: (verified: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Merged onto the inner input (e.g. checkout field chrome). */
  inputClassName?: string;
};

/**
 * Google Places Autocomplete restricted to India. User must pick a suggestion
 * so we get structured address_components (courier-safe).
 */
export function GooglePlacesAddressField({
  apiKey,
  id,
  label,
  value,
  onChange,
  onResolved,
  onVerifiedChange,
  disabled,
  className,
  inputClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const hintId = useId();

  const teardown = useCallback(() => {
    if (acRef.current) {
      google.maps.event.clearInstanceListeners(acRef.current);
      acRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!apiKey || disabled) {
      teardown();
      return;
    }
    const input = inputRef.current;
    if (!input) return;

    let cancelled = false;
    void loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        teardown();
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address', 'geometry'],
          types: ['geocode'],
        });
        acRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const parsed = parsePlaceToIndianAddress(place);
          if (!parsed) {
            onVerifiedChange(false);
            return;
          }
          onResolved(parsed);
          onVerifiedChange(true);
        });
      })
      .catch(() => {
        onVerifiedChange(false);
      });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [apiKey, disabled, onResolved, onVerifiedChange, teardown]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        name="shipping-address-search"
        autoComplete="street-address"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onVerifiedChange(false);
          onChange(e.target.value);
        }}
        className={cn('mt-1.5', inputClassName)}
        aria-describedby={hintId}
      />
      <p id={hintId} className="text-[13px] leading-snug text-muted-foreground/90">
        Type and <span className="text-foreground/90 font-medium">select</span> a suggestion — required
        for a deliverable address.
      </p>
    </div>
  );
}
