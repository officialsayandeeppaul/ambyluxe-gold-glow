import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { medusa, isMedusaConfigured } from '@/integrations/medusa/client';
import type { HttpTypes } from '@medusajs/types';
import { isOtpSentSuccess } from '@/lib/authErrors';
import { normalizePhoneE164, phoneToAuthEmail } from '@/lib/phoneAuth';
import { toastOtpSent } from '@/lib/brand';

function e164OrToast(phone: string): string | null {
  try {
    return normalizePhoneE164(phone);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid phone number';
    toast.error(msg);
    return null;
  }
}

/** Profile shape kept for existing pages — backed by Medusa customer. */
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function customerToProfile(c: HttpTypes.StoreCustomer): Profile {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || null;
  const meta =
    c.metadata && typeof c.metadata === 'object' && !Array.isArray(c.metadata)
      ? (c.metadata as Record<string, unknown>)
      : {};
  const avatarRaw = meta.avatar_url;
  const avatarUrl = typeof avatarRaw === 'string' && avatarRaw.trim() ? avatarRaw.trim() : null;
  const now = new Date().toISOString();
  const createdAt = c.created_at ? new Date(c.created_at).toISOString() : now;
  const updatedAt = c.updated_at
    ? new Date(c.updated_at).toISOString()
    : c.created_at
      ? new Date(c.created_at).toISOString()
      : now;
  return {
    id: c.id,
    user_id: c.id,
    full_name: name,
    phone: c.phone ?? null,
    address: null,
    avatar_url: avatarUrl,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function parseAdminEmails(): string[] {
  const raw = import.meta.env.VITE_STORE_ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // base64url -> base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findEmailInPayload(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.includes('@') ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEmailInPayload(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    // Prefer common explicit keys first.
    const priorityKeys = ['email', 'customer_email', 'identifier', 'preferred_username', 'upn'];
    for (const key of priorityKeys) {
      const found = findEmailInPayload(record[key]);
      if (found) return found;
    }

    // Then search all string claims recursively.
    for (const entry of Object.values(record)) {
      const found = findEmailInPayload(entry);
      if (found) return found;
    }
  }

  return null;
}

interface AuthContextType {
  /** Back-compat for UI that expected Supabase `user` — use `customer` for Medusa fields. */
  user: { id: string; email: string } | null;
  customer: HttpTypes.StoreCustomer | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  googleAuthEnabled: boolean;
  phoneOtpEnabled: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (
    email: string,
    password: string,
    options?: { variant?: 'customer' | 'admin' },
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeOAuthCallback: (provider: string, query: Record<string, string>) => Promise<void>;
  requestPhoneOtp: (phone: string) => Promise<string>;
  verifyPhoneOtp: (
    phone: string,
    otp: string,
    options?: { silent?: boolean },
  ) => Promise<boolean>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<boolean>;
  completePhoneSignup: (
    phone: string,
    password: string,
    fullName?: string,
    contactEmail?: string,
  ) => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>) => Promise<void>;
  refreshCustomer: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Keep this directly under the context so Vite/SWC always exposes a stable named export. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneProvider, setPhoneProvider] = useState<string | null>(null);

  const authProviderHints = {
    google: import.meta.env.VITE_MEDUSA_AUTH_GOOGLE_PROVIDER?.trim() || '',
    phone: (import.meta.env.VITE_MEDUSA_AUTH_PHONE_PROVIDER?.trim() || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const googleAuthEnabled = Boolean(authProviderHints.google);
  const phoneOtpEnabled = authProviderHints.phone.length > 0;

  const refreshCustomer = useCallback(async () => {
    if (!isMedusaConfigured()) {
      setCustomer(null);
      return;
    }
    try {
      const { customer: c } = await medusa.store.customer.retrieve();
      setCustomer(c);
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    if (!isMedusaConfigured()) {
      setIsLoading(false);
      return;
    }
    // During OAuth callback, we haven't exchanged the provider token yet.
    // Avoid calling `/store/customers/me` early (it will 401 and may confuse the UI).
    const isAuthCallbackRoute = window.location.pathname === '/auth/callback';
    if (isAuthCallbackRoute) {
      setIsLoading(false);
      return;
    }
    void refreshCustomer().finally(() => setIsLoading(false));
  }, [refreshCustomer]);

  const profile = customer ? customerToProfile(customer) : null;
  const user = customer?.email
    ? { id: customer.id, email: customer.email }
    : null;
  const adminEmails = parseAdminEmails();
  const isAdmin =
    Boolean(customer?.email && adminEmails.includes(customer.email.toLowerCase()));

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isMedusaConfigured()) {
      toast.error('Medusa backend URL is not configured.');
      throw new Error('no medusa');
    }
    const parts = fullName?.trim().split(/\s+/) ?? [];
    const first = parts[0] ?? '';
    const last = parts.slice(1).join(' ') || '';

    await medusa.auth.register('customer', 'emailpass', { email: email.trim(), password });
    await medusa.store.customer.create({
      email: email.trim(),
      first_name: first || email.split('@')[0],
      last_name: last,
    });
    await refreshCustomer();
    toast.success('Account created.');
  };

  const signIn = async (
    email: string,
    password: string,
    options?: { variant?: 'customer' | 'admin' },
  ) => {
    const variant = options?.variant ?? 'customer';
    if (!isMedusaConfigured()) {
      toast.error('Medusa backend URL is not configured.');
      throw new Error('no medusa');
    }

    const result = await medusa.auth.login('customer', 'emailpass', {
      email: email.trim(),
      password,
    });

    if (typeof result !== 'string' && result && 'location' in result) {
      toast.error('This login requires a redirect (OAuth). Use email & password.');
      await medusa.auth.logout();
      return false;
    }

    await refreshCustomer();
    const { customer: c } = await medusa.store.customer.retrieve();

    if (variant === 'admin') {
      const emails = parseAdminEmails();
      if (!c?.email || !emails.includes(c.email.toLowerCase())) {
        toast.error('This account is not allowed to open the store admin hub.');
        await medusa.auth.logout();
        setCustomer(null);
        return false;
      }
      toast.success('Signed in.');
      return true;
    }

    toast.success('Welcome back!');
    return Boolean(c);
  };

  /** Sign in with phone + password (uses emailpass with deterministic `phoneToAuthEmail`). */
  const signInWithPhonePassword = async (phone: string, password: string) => {
    const normalized = e164OrToast(phone);
    if (!normalized) return false;
    const authEmail = phoneToAuthEmail(normalized);
    return signIn(authEmail, password);
  };

  /**
   * After phone OTP is verified, register emailpass + customer (OTP proves number ownership).
   * Logs out the phone session first, then creates password-based identity.
   */
  const completePhoneSignup = async (
    phone: string,
    password: string,
    fullName?: string,
    contactEmail?: string,
  ) => {
    if (!isMedusaConfigured()) {
      toast.error('Medusa backend URL is not configured.');
      throw new Error('no medusa');
    }
    const normalized = e164OrToast(phone);
    if (!normalized) throw new Error('invalid phone');
    const authEmail = phoneToAuthEmail(normalized);
    const parts = fullName?.trim().split(/\s+/) ?? [];
    const first = parts[0] ?? '';
    const last = parts.slice(1).join(' ') || '';
    const customerEmail = (contactEmail?.trim() || authEmail).toLowerCase();

    await medusa.auth.logout();
    setCustomer(null);

    try {
      await medusa.auth.register('customer', 'emailpass', {
        email: authEmail,
        password,
      });
    } catch {
      const result = await medusa.auth.login('customer', 'emailpass', {
        email: authEmail,
        password,
      });
      if (typeof result !== 'string' && result && 'location' in result) {
        throw new Error('Could not complete signup. Try again.');
      }
    }

    try {
      await medusa.store.customer.create({
        email: customerEmail,
        first_name: first || customerEmail.split('@')[0],
        last_name: last,
        phone: normalized,
      });
    } catch {
      /* customer may already exist */
    }

    await refreshCustomer();
    toast.success('Account created.');
  };

  const signOut = async () => {
    await medusa.auth.logout();
    setCustomer(null);
    toast.success('Signed out');
  };

  const signInWithGoogle = async () => {
    if (!isMedusaConfigured()) {
      toast.error('Medusa backend URL is not configured.');
      throw new Error('no medusa');
    }
    if (!googleAuthEnabled) {
      throw new Error('Google login is not enabled in storefront env.');
    }
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const result = await medusa.auth.login('customer', authProviderHints.google, {
      callback_url: callbackUrl,
    });

    if (typeof result !== 'string' && result?.location) {
      window.location.assign(result.location);
      return;
    }
    await refreshCustomer();
    toast.success('Signed in.');
  };

  const completeOAuthCallback = async (provider: string, query: Record<string, string>) => {
    if (!isMedusaConfigured()) throw new Error('no medusa');

    // Medusa callback must receive only OAuth provider params (not our ?provider= route hint).
    const oauthQuery = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'provider'),
    );

    const token = await medusa.auth.callback('customer', provider, oauthQuery);
    const decoded = decodeJwtPayload(token) as {
      actor_id?: string;
      user_metadata?: Record<string, unknown>;
    } | null;

    // Official storefront flow: no linked customer yet => first Google login; create customer then refresh JWT.
    // https://docs.medusajs.com/resources/storefront-development/customers/third-party-login
    const actorId = decoded?.actor_id;
    const hasLinkedCustomer = typeof actorId === 'string' && actorId.length > 0;
    const isFirstSocialLogin = !hasLinkedCustomer;

    if (isFirstSocialLogin) {
      const meta = decoded?.user_metadata ?? {};
      const email =
        (typeof meta.email === 'string' && meta.email.includes('@') ? meta.email : null) ||
        findEmailInPayload(meta) ||
        findEmailInPayload(decoded);

      if (!email?.includes('@')) {
        throw new Error('Google sign-in worked, but we need your email to finish account creation.');
      }

      const firstName =
        (typeof meta.first_name === 'string' && meta.first_name) ||
        (typeof meta.given_name === 'string' && meta.given_name) ||
        email.split('@')[0];
      const lastName =
        (typeof meta.last_name === 'string' && meta.last_name) ||
        (typeof meta.family_name === 'string' && meta.family_name) ||
        '';

      try {
        await medusa.store.customer.create({
          email,
          first_name: firstName,
          last_name: lastName,
        });
      } catch {
        // Customer may already exist (retry / race). Refresh will attach identity to existing row when applicable.
      }
      await medusa.auth.refresh();
    }

    try {
      const { customer: c } = await medusa.store.customer.retrieve();
      setCustomer(c);
    } catch {
      await medusa.auth.refresh();
      const { customer: c } = await medusa.store.customer.retrieve();
      setCustomer(c);
    }
  };

  const requestPhoneOtp = async (phone: string) => {
    if (!isMedusaConfigured()) throw new Error('no medusa');
    if (!phoneOtpEnabled) {
      throw new Error('Phone OTP is not enabled in storefront env.');
    }
    const normalized = e164OrToast(phone);
    if (!normalized) throw new Error('invalid phone');

    let lastError: unknown = null;
    for (const provider of authProviderHints.phone) {
      try {
        await medusa.auth.login('customer', provider, { phone: normalized });
        setPhoneProvider(provider);
        toast.success(toastOtpSent());
        return normalized;
      } catch (err) {
        if (isOtpSentSuccess(err)) {
          setPhoneProvider(provider);
          toast.success(toastOtpSent());
          return normalized;
        }
        lastError = err;
      }
    }
    throw lastError ?? new Error('Phone OTP provider is not configured');
  };

  const verifyPhoneOtp = async (
    phone: string,
    otp: string,
    options?: { silent?: boolean },
  ) => {
    if (!isMedusaConfigured()) throw new Error('no medusa');
    if (!phoneOtpEnabled) {
      throw new Error('Phone OTP is not enabled in storefront env.');
    }
    const normalized = e164OrToast(phone);
    if (!normalized) throw new Error('invalid phone');
    const code = otp.trim();
    const providers = phoneProvider ? [phoneProvider] : authProviderHints.phone;

    let lastError: unknown = null;
    for (const provider of providers) {
      try {
        const result = await medusa.auth.login('customer', provider, {
          phone: normalized,
          otp: code,
          code,
        });
        if (typeof result !== 'string' && result?.location) {
          window.location.assign(result.location);
          return false;
        }
        await refreshCustomer();
        if (!options?.silent) {
          toast.success('Signed in.');
        }
        return true;
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Invalid OTP or provider not configured');
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>) => {
    if (!customer) throw new Error('Not signed in');
    const name = updates.full_name?.trim() ?? '';
    const parts = name.split(/\s+/);
    const currentMeta =
      customer.metadata && typeof customer.metadata === 'object' && !Array.isArray(customer.metadata)
        ? (customer.metadata as Record<string, unknown>)
        : {};
    const avatarPayload =
      typeof updates.avatar_url === 'string' ? updates.avatar_url.trim() : updates.avatar_url;
    const nextMeta: Record<string, unknown> = {
      ...currentMeta,
      ...(avatarPayload !== undefined ? { avatar_url: avatarPayload || null } : {}),
    };
    await medusa.store.customer.update({
      first_name: parts[0] ?? customer.first_name ?? undefined,
      last_name: parts.slice(1).join(' ') || customer.last_name || undefined,
      phone: updates.phone ?? customer.phone ?? undefined,
      metadata: nextMeta,
    });
    await refreshCustomer();
    toast.success('Profile updated');
  };

  const resetPassword = async (email: string) => {
    await medusa.auth.resetPassword('customer', 'emailpass', {
      identifier: email.trim(),
    });
    toast.success('If an account exists, you will receive reset instructions.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        profile,
        isAdmin,
        isLoading,
        googleAuthEnabled,
        phoneOtpEnabled,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        completeOAuthCallback,
        requestPhoneOtp,
        verifyPhoneOtp,
        signInWithPhonePassword,
        completePhoneSignup,
        updateProfile,
        refreshCustomer,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
