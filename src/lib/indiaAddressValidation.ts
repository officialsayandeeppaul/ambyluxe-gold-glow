import { matchIndiaStateLabel } from '@/data/indiaStatesAndUts';

/** Strip noise; keep single spaces. */
export function normalizeAddressWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Line 1: door / street — must look like a real postal line for couriers (Shiprocket, etc.).
 */
export function validateStreetLine1(line: string): { ok: boolean; message?: string } {
  const s = normalizeAddressWhitespace(line);
  if (s.length < 12) {
    return {
      ok: false,
      message:
        'Use your full street address (building or plot number, road name, locality). Minimum 12 characters.',
    };
  }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return {
      ok: false,
      message: 'Include at least two words (e.g. building name and street or area).',
    };
  }
  if (/https?:\/\//i.test(s) || /\s@\s?|@\w/.test(s)) {
    return { ok: false, message: 'Address cannot contain links or email.' };
  }
  const compact = s.replace(/\s/g, '');
  if (/^(.)\1{12,}$/i.test(compact)) {
    return { ok: false, message: 'Please enter a real address.' };
  }
  return { ok: true };
}

/**
 * Line 2: flat, floor, tower, landmark — required for delivery quality.
 */
export function validateAddress2Landmark(line: string): { ok: boolean; message?: string } {
  const s = normalizeAddressWhitespace(line);
  if (s.length < 3) {
    return {
      ok: false,
      message:
        'Add flat / floor / tower or a nearby landmark (minimum 3 characters). Couriers need this.',
    };
  }
  return { ok: true };
}

function normState(s: string): string {
  return matchIndiaStateLabel(s)
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function statesAlignForPin(
  selectedProvince: string,
  pinDirectoryState: string | undefined,
): boolean {
  const a = normState(selectedProvince);
  const b = normState((pinDirectoryState ?? '').trim());
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Soft check: selected district vs India Post “District” on PIN (word overlap). */
export function districtFuzzyMatch(selected: string, pinDistrict: string | undefined): boolean {
  const d = (pinDistrict ?? '').trim().toLowerCase();
  const s = selected.trim().toLowerCase();
  if (!d || !s) return true;
  return d === s || d.includes(s) || s.includes(d);
}
