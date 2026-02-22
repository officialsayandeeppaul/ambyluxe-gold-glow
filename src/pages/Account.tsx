import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { User, Mail, Phone, MapPin, LogOut, Shield, Package, Heart } from 'lucide-react';

const Account = () => {
  const { user, profile, isAdmin, isLoading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        address,
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
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
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="pl-10 py-6 bg-background border-border/50 focus:border-primary/50"
                        />
                      </div>
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
