import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Smartphone } from 'lucide-react';
import { isMedusaConfigured } from '@/integrations/medusa/client';
import { BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

type AuthMode = 'signin' | 'signup';
type CredentialTab = 'email' | 'phone';
type PhoneSignupStep = 1 | 2 | 3;
const INDIA_COUNTRY_CODE = '+91';

function phoneDigitsOnly(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

function phoneDisplayDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) return digits.slice(-10);
  return digits.slice(-10);
}

function toIndiaE164(localDigits: string): string {
  return `${INDIA_COUNTRY_CODE}${phoneDigitsOnly(localDigits)}`;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const resetRequested = searchParams.get('reset') === 'true';
  const signupRequested = searchParams.get('signup') === 'true';
  const googleEmail = searchParams.get('email') ?? '';

  const [authMode, setAuthMode] = useState<AuthMode>(signupRequested ? 'signup' : 'signin');
  const [credentialTab, setCredentialTab] = useState<CredentialTab>('email');
  const [signupPhoneStep, setSignupPhoneStep] = useState<PhoneSignupStep>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupContactEmail, setSignupContactEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithPhonePassword,
    completePhoneSignup,
    requestPhoneOtp,
    verifyPhoneOtp,
    resetPassword,
    user,
    googleAuthEnabled,
    phoneOtpEnabled,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (googleEmail) {
      setEmail(googleEmail);
      setAuthMode('signup');
      setCredentialTab('email');
    }
  }, [googleEmail]);

  useEffect(() => {
    if (resetRequested) setShowForgotPassword(false);
  }, [resetRequested]);

  useEffect(() => {
    setSignupPhoneStep(1);
    setOtpRequested(false);
    setOtp('');
  }, [authMode, credentialTab]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMedusaConfigured()) return;
    setIsSubmitting(true);
    try {
      if (authMode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
      }
      navigate('/');
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhonePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const local = phoneDigitsOnly(phone);
    if (!isMedusaConfigured() || local.length !== 10 || !password) return;
    setIsSubmitting(true);
    try {
      await signInWithPhonePassword(toIndiaE164(local), password);
      navigate('/');
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setShowForgotPassword(false);
      setResetEmail('');
    } catch {
      /* toast */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isMedusaConfigured()) return;
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      /* toast from hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupPhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const local = phoneDigitsOnly(phone);
    if (local.length !== 10) return;
    if (!isMedusaConfigured()) return;
    setIsSubmitting(true);
    try {
      const e164 = await requestPhoneOtp(toIndiaE164(local));
      setPhone(e164);
      setSignupPhoneStep(2);
      setOtpRequested(true);
    } catch {
      /* toast */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupPhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMedusaConfigured()) return;
    setIsSubmitting(true);
    try {
      const ok = await verifyPhoneOtp(phone, otp, { silent: true });
      if (ok) {
        setSignupPhoneStep(3);
        setOtp('');
      }
    } catch {
      /* toast */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupPhoneComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMedusaConfigured()) return;
    if (password !== confirmPassword) {
      return;
    }
    setIsSubmitting(true);
    try {
      await completePhoneSignup(phone, password, fullName, signupContactEmail || undefined);
      navigate('/');
    } catch {
      /* toast */
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle = () => {
    if (showForgotPassword) return 'We will email reset steps if your account exists.';
    if (credentialTab === 'phone') {
      if (authMode === 'signin') {
        return 'Sign in with mobile + password only — no OTP. Use the same number you verified at sign up.';
      }
      if (signupPhoneStep === 1) return `${BRAND_NAME} will send a verification code to your mobile number.`;
      if (signupPhoneStep === 2) return `Enter the code from your SMS (${BRAND_NAME}). Next, set your password.`;
      return 'Choose a password and your name. Contact email is optional (for order updates).';
    }
    if (googleAuthEnabled || phoneOtpEnabled) {
      return 'Email and password, or switch to phone / Google (Medusa customer account).';
    }
    return 'Email and password (Medusa customer account).';
  };

  /** Email vs Mobile: Mobile sign-in uses password only (no Twilio). Mobile sign-up still needs OTP → Twilio. */
  const showCredentialTabs = !showForgotPassword;
  const showGoogleRow =
    !showForgotPassword &&
    credentialTab === 'email' &&
    (googleAuthEnabled || (phoneOtpEnabled && authMode === 'signin'));

  const renderEmailForm = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-5">
      {authMode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              placeholder="Your name"
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Toggle password"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {authMode === 'signin' && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setShowForgotPassword(true)}
        >
          Forgot password?
        </button>
      )}
      <Button type="submit" variant="luxury" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  );

  const renderPhonePasswordSignIn = () => (
    <form onSubmit={handlePhonePasswordSignIn} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone-pw">Mobile number</Label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone-pw"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={phoneDisplayDigits(phone)}
            onChange={(e) => setPhone(phoneDigitsOnly(e.target.value))}
            className="pl-20"
            placeholder="9876543210"
            autoComplete="tel-national"
          />
          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {INDIA_COUNTRY_CODE}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Enter 10-digit mobile only. +91 is fixed automatically.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone-signin-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone-signin-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Toggle password"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        variant="luxury"
        className="w-full gap-2"
        disabled={isSubmitting || phoneDisplayDigits(phone).length !== 10}
      >
        {isSubmitting ? 'Please wait…' : 'Sign in'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  );

  /** Sign-up only: verify OTP after Send OTP (sign-in uses mobile + password, no OTP). */
  const renderSignupPhoneOtpForm = () => (
    <form onSubmit={handleSignupPhoneVerifyOtp} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone-otp">Phone</Label>
        <Input
          id="phone-otp"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91..."
          disabled
          className="opacity-80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="otp">OTP code</Label>
        <Input
          id="otp"
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="luxury" className="flex-1" disabled={isSubmitting}>
          Verify & continue
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSignupPhoneStep(1);
            setOtp('');
            setOtpRequested(false);
          }}
        >
          Back
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Verification SMS from {BRAND_NAME} (Twilio Verify). Standard carrier rates may apply.
      </p>
    </form>
  );

  const renderPhoneSignupProfile = () => (
    <form onSubmit={handleSignupPhoneComplete} className="space-y-5">
      <p className="text-xs text-muted-foreground rounded-sm border border-border/50 px-3 py-2">
        Phone verified: <span className="text-foreground font-medium">{phone}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="su-fullName">Full name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="su-fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10"
            placeholder="Your name"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-contact-email">Contact email (optional)</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="su-contact-email"
            type="email"
            value={signupContactEmail}
            onChange={(e) => setSignupContactEmail(e.target.value)}
            className="pl-10"
            placeholder="orders@example.com"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pw">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="su-pw"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Toggle password"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pw2">Confirm password</Label>
        <Input
          id="su-pw2"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="luxury"
          className="flex-1"
          disabled={isSubmitting || password !== confirmPassword}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setSignupPhoneStep(2)}>
          Back
        </Button>
      </div>
    </form>
  );

  const renderPhoneSignupStep1 = () => (
    <form onSubmit={handleSignupPhoneSendOtp} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="su-phone">Mobile number</Label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="su-phone"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={phoneDisplayDigits(phone)}
            onChange={(e) => setPhone(phoneDigitsOnly(e.target.value))}
            className="pl-20"
            placeholder="9876543210"
            autoComplete="tel-national"
          />
          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {INDIA_COUNTRY_CODE}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Enter 10-digit mobile only. +91 is fixed for SMS from {BRAND_NAME}.
        </p>
      </div>
      <Button
        type="submit"
        variant="luxury"
        className="w-full gap-2"
        disabled={isSubmitting || phoneDisplayDigits(phone).length !== 10}
      >
        {isSubmitting ? 'Sending…' : 'Send OTP'}
        <ArrowRight className="w-4 h-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        Next: enter the code, then set your password to finish registration.
      </p>
    </form>
  );

  return (
    <Layout>
      <section className="min-h-screen flex items-center justify-center pt-28 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto px-6"
        >
          <div className="glass-card p-8 md:p-10 rounded-sm">
            <div className="text-center mb-6">
              <span className="text-xs uppercase tracking-[0.3em] text-primary mb-4 block">
                {authMode === 'signin' ? 'Welcome back' : 'Join us'}
              </span>
              <h1 className="text-3xl font-display font-light mb-2">
                {showForgotPassword ? 'Reset password' : authMode === 'signin' ? 'Sign in' : 'Create account'}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle()}</p>
            </div>

            {!isMedusaConfigured() && (
              <p className="text-sm text-destructive mb-4">
                Set <code className="text-xs">VITE_MEDUSA_URL</code> and{' '}
                <code className="text-xs">VITE_MEDUSA_PUBLISHABLE_KEY</code> in <code className="text-xs">.env</code>.
              </p>
            )}

            {showCredentialTabs && !showForgotPassword && (
              <div className="flex rounded-sm border border-border/60 p-1 mb-6 bg-muted/20">
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors',
                    credentialTab === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setCredentialTab('email')}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors',
                    credentialTab === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setCredentialTab('phone')}
                >
                  Mobile
                </button>
              </div>
            )}

            {showForgotPassword && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="luxury" className="flex-1" disabled={isSubmitting}>
                    Send reset
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                    Back
                  </Button>
                </div>
              </form>
            )}

            {!showForgotPassword && credentialTab === 'email' && renderEmailForm()}

            {!showForgotPassword && credentialTab === 'phone' && authMode === 'signin' && renderPhonePasswordSignIn()}

            {!showForgotPassword && credentialTab === 'phone' && phoneOtpEnabled && authMode === 'signup' && (
              <>
                {signupPhoneStep === 1 && renderPhoneSignupStep1()}
                {signupPhoneStep === 2 && renderSignupPhoneOtpForm()}
                {signupPhoneStep === 3 && renderPhoneSignupProfile()}
              </>
            )}

            {!showForgotPassword &&
              credentialTab === 'phone' &&
              authMode === 'signup' &&
              !phoneOtpEnabled && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Mobile sign-up needs SMS OTP. Set{' '}
                  <code className="text-xs">VITE_MEDUSA_AUTH_PHONE_PROVIDER</code> and Twilio in{' '}
                  <code className="text-xs">backend/.env</code>. Mobile sign-in with password works without Twilio if you
                  already registered with mobile.
                </p>
              )}

            {showGoogleRow && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {googleAuthEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                  >
                    Continue with Google
                  </Button>
                )}
                {phoneOtpEnabled && authMode === 'signin' && credentialTab === 'email' && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-2 mt-2"
                    onClick={() => setCredentialTab('phone')}
                    disabled={isSubmitting}
                  >
                    <Smartphone className="w-4 h-4" />
                    Continue with mobile
                  </Button>
                )}
              </>
            )}

            {!showForgotPassword && !(credentialTab === 'phone' && authMode === 'signup' && signupPhoneStep > 1) && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                {authMode === 'signin' ? (
                  <>
                    No account?{' '}
                    <button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('signup')}>
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Have an account?{' '}
                    <button type="button" className="text-primary hover:underline" onClick={() => setAuthMode('signin')}>
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}

            <p className="text-center text-xs mt-4">
              <Link to="/" className="text-muted-foreground hover:text-primary">
                Back to home
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Auth;
