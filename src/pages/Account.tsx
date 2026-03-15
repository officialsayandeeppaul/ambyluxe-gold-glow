import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { User, Mail, Phone, MapPin, LogOut, Shield, Package, Heart } from 'lucide-react';
import { ProfileAvatar } from '@/components/ProfileAvatar';

const Account = () => {
  const { user, profile, isAdmin, isLoading, signOut, updateProfile, updateUserEmail, updateUserPhone, verifyPhoneChange } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emailToBind, setEmailToBind] = useState('');
  const [phoneToBind, setPhoneToBind] = useState('');
  const [otpForPhone, setOtpForPhone] = useState('');
  const [phoneBindStep, setPhoneBindStep] = useState<'input' | 'otp'>('input');
  const [isSaving, setIsSaving] = useState(false);
  const [isBindingEmail, setIsBindingEmail] = useState(false);
  const [isBindingPhone, setIsBindingPhone] = useState(false);
  const [emailRateLimited, setEmailRateLimited] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(user?.phone || profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile, user?.phone]);

  /** Safety: if loading hangs > 8s, show fallback */
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setLoadTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [isLoading]);

  /** Restore pending phone verification after refresh (user has new_phone + phone_change_sent_at) */
  useEffect(() => {
    const u = user as { new_phone?: string; phone_change_sent_at?: string } | null;
    if (!u?.phone && u?.new_phone && u?.phone_change_sent_at) {
      const digits = u.new_phone.replace(/\D/g, '');
      const ten = digits.length >= 10 ? digits.slice(-10) : digits;
      setPhoneToBind(ten);
      setPhoneBindStep('otp');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        address,
      });
    } catch {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleBindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToBind.trim()) return;
    setEmailRateLimited(false);
    setIsBindingEmail(true);
    try {
      await updateUserEmail(emailToBind);
      setEmailToBind('');
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message || '').toLowerCase();
      const code = (err as { code?: string })?.code;
      if (msg.includes('rate limit') || code === 'over_email_send_rate_limit') {
        setEmailRateLimited(true);
      }
    } finally {
      setIsBindingEmail(false);
    }
  };

  const handleRequestPhoneBind = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneToBind.replace(/\D/g, '');
    if (digits.length < 10) return;
    setIsBindingPhone(true);
    try {
      await updateUserPhone(phoneToBind);
      setPhoneBindStep('otp');
      setOtpForPhone('');
    } catch {
      // Error handled in hook
    } finally {
      setIsBindingPhone(false);
    }
  };

  const handleVerifyPhoneBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpForPhone.length !== 6) return;
    setIsBindingPhone(true);
    try {
      await verifyPhoneChange(phoneToBind, otpForPhone);
      setPhoneToBind('');
      setOtpForPhone('');
      setPhoneBindStep('input');
    } catch {
      // Error handled in hook
    } finally {
      setIsBindingPhone(false);
    }
  };

  const formatPhoneDisplay = (val: string) => {
    const d = val.replace(/\D/g, '');
    const ten = d.length >= 10 ? d.slice(-10) : d;
    if (ten.length <= 5) return ten.replace(/(\d{2})(\d{0,3})/, '+91 $1 $2').trim();
    return ('+91 ' + ten.slice(0, 5) + ' ' + ten.slice(5, 10)).trim();
  };

  const hasAuthEmail = !!user?.email;
  const hasAuthPhone = !!user?.phone;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading && !loadTimeout) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (loadTimeout && !user) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <p className="text-muted-foreground text-center">Having trouble loading your account.</p>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Sign In Again
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Header */}
            <div className="mb-12">
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-4">
                <span className="w-8 h-px bg-primary" />
                My Account
              </span>
              <h1 className="text-display-md font-display font-light">
                Welcome, <span className="italic text-gold-gradient">{profile?.full_name || 'Guest'}</span>
              </h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Sidebar */}
              <div className="space-y-4">
                <div className="glass-card p-6 rounded-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      <ProfileAvatar
                        avatarUrl={profile?.avatar_url ?? null}
                        seed={user?.id ?? user?.email ?? undefined}
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <nav className="space-y-2">
                    <Link
                      to="/account"
                      className="flex items-center gap-3 px-4 py-3 rounded-sm bg-primary/10 text-primary"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Orders</span>
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">Wishlist</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Admin Dashboard</span>
                      </Link>
                    )}
                  </nav>

                  <div className="mt-6 pt-6 border-t border-border/30">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="glass-card p-8 rounded-sm">
                  <h2 className="text-xl font-display font-light mb-6">Profile Information</h2>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                        Email Address
                      </Label>
                      {hasAuthEmail ? (
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="pl-10 py-6 bg-muted/30 border-border/30"
                          />
                        </div>
                      ) : (
                        <form onSubmit={handleBindEmail} className="space-y-2">
                          <div className="flex gap-2 items-stretch">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                value={emailToBind}
                                onChange={(e) => { setEmailToBind(e.target.value); setEmailRateLimited(false); }}
                                placeholder="Add your email"
                                className="pl-10 py-6 h-14 bg-background border-border/50 focus:border-primary/50"
                              />
                            </div>
                            <Button type="submit" disabled={isBindingEmail || !emailToBind.trim() || emailRateLimited} className="h-14 shrink-0 px-6">
                              {isBindingEmail ? 'Sending...' : 'Verify Email'}
                            </Button>
                          </div>
                          {emailRateLimited ? (
                            <p className="text-sm text-amber-500/90">Too many verification emails. Please try again in 30–60 minutes.</p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">We&apos;ll send a verification link to bind your email.</p>
                          )}
                        </form>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs uppercase tracking-wider">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="pl-10 py-6 bg-background border-border/50 focus:border-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs uppercase tracking-wider">
                        Phone Number
                      </Label>
                      {hasAuthPhone ? (
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={formatPhoneDisplay(phone)}
                            disabled
                            className="pl-10 py-6 bg-muted/30 border-border/30"
                          />
                        </div>
                      ) : phoneBindStep === 'input' ? (
                        <form onSubmit={handleRequestPhoneBind} className="space-y-2">
                          <div className="flex gap-2 items-stretch">
                            <div className="flex flex-1 rounded-sm border border-border/50 bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 overflow-hidden">
                              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-border/50 shrink-0">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">+91</span>
                              </div>
                              <Input
                                type="tel"
                                inputMode="numeric"
                                value={phoneToBind}
                                onChange={(e) => setPhoneToBind(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Enter 10-digit mobile number"
                                className="flex-1 h-14 py-6 pl-3 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                              />
                            </div>
                            <Button type="submit" disabled={isBindingPhone || phoneToBind.replace(/\D/g, '').length < 10} className="h-14 shrink-0 px-6">
                              {isBindingPhone ? 'Sending...' : 'Send OTP'}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">We&apos;ll send an OTP to this number. Enter mobile first, then verify.</p>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          {/* Always show number first, then OTP — no direct OTP */}
                          <div className="rounded-sm border border-border/50 bg-muted/30 overflow-hidden">
                            <div className="flex items-center gap-2 pl-4 pr-4 py-3">
                              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm text-muted-foreground">+91</span>
                              <span className="font-medium">{phoneToBind.replace(/\D/g, '').length >= 10 ? formatPhoneDisplay(phoneToBind) : phoneToBind || '—'}</span>
                              <button type="button" onClick={() => { setPhoneBindStep('input'); setOtpForPhone(''); }} className="ml-auto text-xs text-primary hover:text-primary/80">Use different number</button>
                            </div>
                          </div>
                          <form onSubmit={handleVerifyPhoneBind} className="flex gap-2 items-stretch">
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={otpForPhone}
                              onChange={(e) => setOtpForPhone(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="flex-1 h-14 py-6 text-center text-lg tracking-[0.3em] bg-background border-border/50 focus:border-primary/50"
                            />
                            <Button type="submit" disabled={isBindingPhone || otpForPhone.length !== 6} className="h-14 shrink-0 px-6">
                              {isBindingPhone ? 'Verifying...' : 'Verify'}
                            </Button>
                          </form>
                        </div>
                      )}
                      {!hasAuthPhone && phoneBindStep === 'input' && (
                        <p className="text-[11px] text-muted-foreground">Enter your 10-digit mobile number above, then tap Send OTP.</p>
                      )}
                      {!hasAuthPhone && phoneBindStep === 'otp' && (
                        <p className="text-[11px] text-muted-foreground">Code sent to the number above. Enter the 6-digit OTP, or use a different number.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-xs uppercase tracking-wider">
                        Address
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <textarea
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter your address"
                          rows={3}
                          className="w-full pl-10 py-3 bg-background border border-border/50 focus:border-primary/50 rounded-sm resize-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Account;
