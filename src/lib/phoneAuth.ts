/**
 * Medusa emailpass uses an email identifier. For phone-based password login we use a
 * deterministic synthetic address so the same phone always maps to one account.
 */
export function phoneToAuthEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('Enter a valid phone number (at least 10 digits).');
  }
  return `${digits}@phone.local`;
}

/**
 * Normalize user input to E.164 for Twilio and Medusa phone auth.
 * India: 10-digit mobiles (and common 91 / 0-prefixed forms) become +91XXXXXXXXXX.
 */
export function normalizePhoneE164(raw: string): string {
  const s = raw.trim();
  if (!s) {
    throw new Error('Phone is required.');
  }

  const digits = s.replace(/\D/g, '');

  if (digits.length < 10) {
    throw new Error('Enter a valid phone number (at least 10 digits).');
  }

  // India: 0 + 10-digit mobile (e.g. 07679329685)
  if (digits.length === 11 && /^0[6-9]\d{9}$/.test(digits)) {
    return `+91${digits.slice(1)}`;
  }

  // India: 91 + 10-digit mobile
  if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // India: 10-digit local numbers → +91 (E.164 for Twilio)
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Full international (country code already included)
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  throw new Error('Enter a valid phone number (10-digit Indian mobile or full international).');
}

/** @deprecated Use normalizePhoneE164 — kept for call sites that expect canonical phone. */
export function normalizePhoneInput(phone: string): string {
  return normalizePhoneE164(phone);
}

/** True when the Medusa customer email is our synthetic mobile-login id. */
export function isPhoneAuthEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith('@phone.local'));
}

/** Pretty label for synthetic id, e.g. 919876543210@phone.local → "+919876543210" */
export function formatPhoneAuthLabel(email: string): string {
  const m = email.match(/^(\d+)@phone\.local$/i);
  if (!m) return email;
  const d = m[1];
  return d.length >= 10 ? `+${d}` : d;
}
