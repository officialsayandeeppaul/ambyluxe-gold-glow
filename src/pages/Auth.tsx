import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Phone, Sparkles } from 'lucide-react';

type AuthMode = 'signin' | 'signup';
type AuthTab = 'email' | 'phone';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const resetRequested = searchParams.get('reset') === 'true';

  const [authTab, setAuthTab] = useState<AuthTab>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    sendPhoneOtp,
    verifyPhoneOtp,
    resetPassword,
    user,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (resetRequested) {
      setShowForgotPassword(false);
    }
  }, [resetRequested]);

  useEffect(() => {
    if (!otpSent || resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [otpSent, resendCooldown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (useMagicLink) {
        await signInWithMagicLink(email);
      } else if (authMode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
      }
      if (!useMagicLink) navigate('/');
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPhoneOtp(phone);
      setOtpSent(true);
      setOtp('');
      setResendCooldown(60);
    } catch {
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    setIsSubmitting(true);
    try {
      await verifyPhoneOtp(phone, otp);
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
      /* toast in hook */
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneDisplay = (val: string) => {
    const d = val.replace(/\D/g, '');
    if (d.length <= 5) return d.replace(/(\d{2})(\d{0,3})/, '+91 $1 $2').trim();
    return ('+91 ' + d.slice(0, 5) + ' ' + d.slice(5, 10)).trim();
  };

  return (
    <Layout>
      <section className="min-h-screen flex items-center justify-center pt-28 pb-20 px-4 relative overflow-y-auto overflow-x-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(42 78% 52% / 0.3), transparent 60%)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md mx-auto px-6"
        >
          <div className="glass-card p-8 md:p-10 rounded-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="text-xs uppercase tracking-[0.3em] text-primary mb-4 block">
                {authMode === 'signin' ? 'Welcome Back' : 'Join Us'}
              </span>
              <h1 className="text-3xl font-display font-light mb-2">
                {showForgotPassword ? 'Reset Password' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {showForgotPassword
                  ? 'Enter your email to receive a reset link'
                  : authMode === 'signin'
                  ? 'Access your exclusive Amby Luxe experience'
                  : 'Begin your journey with Amby Luxe Jewels'}
              </p>
            </div>

            {!showForgotPassword && (
              <>
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full mb-6 py-6 border-border/50 hover:border-primary/50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Tabs: Email | Phone */}
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => { setAuthTab('email'); setOtpSent(false); setOtp(''); setResendCooldown(0); }}
                    className={`flex-1 py-2.5 text-xs uppercase tracking-wider transition-colors rounded-sm ${
                      authTab === 'email' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('phone'); setOtpSent(false); setOtp(''); setResendCooldown(0); }}
                    className={`flex-1 py-2.5 text-xs uppercase tracking-wider transition-colors rounded-sm ${
                      authTab === 'phone' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {authTab === 'email' ? (
                    <motion.form
                      key="email"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleEmailSubmit}
                      className="space-y-5"
                    >
                      {authMode === 'signup' && !useMagicLink && (
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-xs uppercase tracking-wider">Full Name</Label>
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
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase tracking-wider">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            className="pl-10 py-6 bg-background border-border/50 focus:border-primary/50"
                          />
                        </div>
                      </div>

                      {!useMagicLink && (
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-xs uppercase tracking-wider">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder={authMode === 'signin' ? 'Enter your password' : 'Create a password (min 6 characters)'}
                              required={!useMagicLink}
                              minLength={6}
                              className="pl-10 pr-10 py-6 bg-background border-border/50 focus:border-primary/50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {authMode === 'signin' && (
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                      )}

                      {authMode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setUseMagicLink(!useMagicLink)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
                        </button>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {useMagicLink ? 'Sending link...' : authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {useMagicLink ? 'Send Magic Link' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="phone"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-5"
                    >
                      {!otpSent ? (
                        <form onSubmit={handleSendPhoneOtp} className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs uppercase tracking-wider">Mobile Number</Label>
                            <div className="flex rounded-sm border border-border/50 bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 overflow-hidden">
                              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-border/50 shrink-0">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">+91</span>
                              </div>
                              <Input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="98765 43210"
                                className="flex-1 h-14 py-6 pl-3 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground">Enter 10-digit mobile number. OTP will be sent via SMS.</p>
                          </div>
                          <Button
                            type="submit"
                            disabled={isSubmitting || phone.replace(/\D/g, '').length < 10}
                            className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Sending OTP...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                Send OTP
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            )}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyPhoneOtp} className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="otp" className="text-xs uppercase tracking-wider">Enter 6-digit OTP</Label>
                            <Input
                              id="otp"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="py-6 text-center text-lg tracking-[0.5em] bg-background border-border/50 focus:border-primary/50"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Code sent to {formatPhoneDisplay(phone)}
                              {resendCooldown > 0 && (
                                <span className="ml-2 text-muted-foreground/80">· Resend in {resendCooldown}s</span>
                              )}
                            </p>
                            {resendCooldown === 0 && (
                              <button
                                type="button"
                                onClick={handleSendPhoneOtp}
                                disabled={isSubmitting}
                                className="text-xs text-primary hover:text-primary/80"
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                          <Button
                            type="submit"
                            disabled={isSubmitting || otp.length !== 6}
                            className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Verifying...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                Verify & Sign In
                                <ArrowRight className="w-4 h-4" />
                              </span>
                            )}
                          </Button>
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setOtp(''); setResendCooldown(0); }}
                            className="w-full text-sm text-muted-foreground hover:text-primary"
                          >
                            Use a different number
                          </button>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setUseMagicLink(false); }}
                      className="ml-2 text-primary hover:text-primary/80 font-medium"
                    >
                      {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </>
            )}

            {showForgotPassword && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleResetPassword}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-xs uppercase tracking-wider">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="pl-10 py-6 bg-background border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-sm text-muted-foreground hover:text-primary"
                >
                  Back to sign in
                </button>
              </motion.form>
            )}
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};

export default Auth;
