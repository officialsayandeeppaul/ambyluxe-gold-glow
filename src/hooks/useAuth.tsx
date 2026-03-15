import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'customer';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPhone: (phone: string) => Promise<void>;
  verifyPhoneChange: (phone: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Normalize phone to E.164 for India: always +91 followed by exactly 10 digits. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const len = digits.length;
  let ten = digits;
  if (len > 10) {
    if (len >= 12 && digits.startsWith('91')) {
      ten = digits.slice(2, 12);
    } else {
      ten = digits.slice(-10);
    }
  } else if (len < 10) {
    ten = digits;
  }
  return '+91' + ten;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = roles.some(r => r.role === 'admin');

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  /** Ensure profile exists and is synced with auth user metadata (profile binding) */
  const ensureProfileBinding = async (authUser: User) => {
    try {
      const meta = authUser.user_metadata || {};
      const fullName = meta.full_name || meta.name || meta.email;
      const avatarUrl = meta.avatar_url;
      const phone = authUser.phone || meta.phone;

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existing) {
        const updates: Record<string, unknown> = {};
        if (fullName) updates.full_name = fullName;
        if (avatarUrl) updates.avatar_url = avatarUrl;
        if (phone) updates.phone = phone;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('user_id', authUser.id);
        }
      }
    } catch (err) {
      console.error('Profile binding error:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          ensureProfileBinding(session.user).catch(() => {});
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        ensureProfileBinding(session.user).catch(() => {});
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Check your email to confirm your account.');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Welcome back!');
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('not enabled') || msg.includes('unsupported provider')) {
        toast.error('Google sign-in is not enabled. Enable it in Supabase Dashboard → Auth → Providers.');
      } else {
        toast.error(error.message);
      }
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Check your email for the sign-in link.');
  };

  const sendPhoneOtp = async (phone: string) => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { channel: 'sms' },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('phone provider') || msg.includes('unsupported')) {
        toast.error('Mobile sign-in is not set up. Enable Phone provider and add an SMS provider in Supabase Dashboard → Auth → Providers.');
      } else {
        toast.error(error.message);
      }
      throw error;
    }
    toast.success('OTP sent to your phone.');
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: token.trim(),
      type: 'sms',
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Signed in successfully!');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Check your email for the password reset link.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setProfile(null);
    setRoles([]);
    toast.success('Signed out successfully');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      toast.error(error.message);
      throw error;
    }

    setProfile(prev => (prev ? { ...prev, ...updates } : null));
    toast.success('Profile updated!');
  };

  /** Bind email to account (e.g. after phone-only signup). Sends verification link. */
  const updateUserEmail = async (email: string) => {
    const { data, error } = await supabase.auth.updateUser({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      if (error.code !== 'over_email_send_rate_limit') {
        toast.error(error.message);
      }
      throw error;
    }
    setUser(data.user);
    toast.success('Check your email to verify and complete binding.');
  };

  /** Request phone binding (sends OTP). Call verifyPhoneChange with the OTP to complete. */
  const updateUserPhone = async (phone: string) => {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.auth.updateUser({
      phone: normalized,
      options: { channel: 'sms' },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('phone provider') || msg.includes('unsupported')) {
        toast.error('SMS is not configured. Enable Phone provider in Supabase.');
        throw error;
      }
      if (msg.includes('already been registered') || msg.includes('already registered')) {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        const existingPhone = freshUser?.phone ? normalizePhone(freshUser.phone) : null;
        if (existingPhone === normalized) {
          await ensureProfileBinding(freshUser!);
          await fetchProfile(freshUser!.id);
          setUser(freshUser ?? null);
          toast.success('This number is already linked to your account.');
          return;
        }
        toast.error('This number is already used by another account. Use a different number or sign in with that phone.');
        throw error;
      }
      toast.error(error.message);
      throw error;
    }
    setUser(data.user);
    toast.success('OTP sent to your phone.');
  };

  /** Complete phone binding after updateUserPhone. */
  const verifyPhoneChange = async (phone: string, token: string) => {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: token.trim(),
      type: 'phone_change',
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setUser(data.user);
    await ensureProfileBinding(data.user);
    await fetchProfile(data.user.id);
    toast.success('Phone linked successfully.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isAdmin,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithMagicLink,
        sendPhoneOtp,
        verifyPhoneOtp,
        resetPassword,
        signOut,
        updateProfile,
        refreshProfile,
        updateUserEmail,
        updateUserPhone,
        verifyPhoneChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
