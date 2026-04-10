import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { User, Mail, Phone, LogOut, Shield, Heart, Package, Upload } from 'lucide-react';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { formatPhoneAuthLabel, isPhoneAuthEmail } from '@/lib/phoneAuth';
import { toast } from 'sonner';

const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-1',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-2',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-3',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-4',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-5',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=gold-6',
];

async function fileToDataUrl(file: File): Promise<string> {
  const maxMB = 2;
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`Image must be ${maxMB}MB or smaller.`);
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not process image.'));
    el.src = dataUrl;
  });

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  // Center-crop to square before compression.
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  return canvas.toDataURL('image/jpeg', 0.85);
}

const Account = () => {
  const { user, customer, profile, isAdmin, isLoading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        avatar_url: avatarUrl ?? '',
      });
    } catch {
      /* toast in hook */
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const phoneAccount = user?.email && isPhoneAuthEmail(user.email);
  const displayContact =
    phoneAccount && (customer?.phone || formatPhoneAuthLabel(user.email));

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setAvatarUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not use this image.');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="mb-12">
              <span className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary mb-4">
                <span className="w-8 h-px bg-primary" />
                My account
              </span>
              <h1 className="text-display-md font-display font-light">
                Welcome, <span className="italic text-gold-gradient">{profile?.full_name || 'Guest'}</span>
              </h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="glass-card p-6 rounded-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      <ProfileAvatar
                        avatarUrl={avatarUrl ?? profile?.avatar_url ?? null}
                        seed={user?.id ?? user?.email ?? undefined}
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                          <Shield className="w-3 h-3" /> Store admin
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
                      to="/account/orders"
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
                        <span className="text-sm">Store hub</span>
                      </Link>
                    )}
                  </nav>

                  <div className="mt-6 pt-6 border-t border-border/30">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Sign out</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="glass-card p-8 rounded-sm">
                  <h2 className="text-xl font-display font-light mb-6">Profile</h2>
                  <div className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider">
                        {phoneAccount ? 'Account email (login id)' : 'Email'}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={user?.email || ''}
                          disabled
                          className="pl-10 bg-muted/30"
                          title={user?.email || ''}
                        />
                      </div>
                      {phoneAccount && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Login uses your mobile number. The address above is your account id in our system; order
                          updates may use your contact email if you added one at sign up.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider">Avatar</Label>
                      <div className="rounded-sm border border-border/35 p-4 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-primary/30">
                            <ProfileAvatar
                              avatarUrl={avatarUrl ?? profile?.avatar_url ?? null}
                              seed={user?.id ?? user?.email ?? undefined}
                              className="w-full h-full"
                            />
                          </div>
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-border/50 text-xs cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                void handleAvatarUpload(file);
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_AVATARS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`w-9 h-9 rounded-full overflow-hidden border transition-colors ${
                                avatarUrl === preset ? 'border-primary' : 'border-border/40 hover:border-primary/50'
                              }`}
                              onClick={() => setAvatarUrl(preset)}
                              title="Use preset avatar"
                            >
                              <img src={preset} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs uppercase tracking-wider">
                        Full name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs uppercase tracking-wider">
                        Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                          placeholder="+91 ..."
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Save changes'}
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
