import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TrendingUp, LogOut, Settings as SettingsIcon, BarChart3, History, Menu, User, Bell, AlertTriangle, Crown, Zap, Loader2, Gift, Copy, Share2, Volume2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { PLANS, type PlanType } from '@/lib/plans';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useUserPlan } from '@/hooks/useUserPlan';
import { getBaseUrl } from '@/lib/urls';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'basic' | 'pro' | null>(null);
  
  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  
  // Notification toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('signal_sound') !== 'false';
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Use the new effective plan hook
  const { effectivePlan, planSource, grantExpiresAt, loading: planLoading } = useUserPlan();

  // Check for success/canceled params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast({
        title: `🎉 ${t('settings.paymentSuccess')}`,
        description: t('settings.paymentSuccessDescription'),
      });
    } else if (canceled === 'true') {
      toast({
        title: t('settings.paymentCanceled'),
        description: t('settings.paymentCanceledDescription'),
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, t]);

  // Load referral code and notification settings
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // Load profile for referral code
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.referral_code) {
          setReferralCode(profile.referral_code);
        }
        
        // Load user_settings for notifications
        const { data: settings } = await supabase
          .from('user_settings')
          .select('notifications_enabled')
          .eq('user_id', user.id)
          .single();
        
        if (settings) {
          setNotificationsEnabled(settings.notifications_enabled);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoadingReferral(false);
      }
    };
    
    loadUserData();
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    toast({
      title: t('settings.accountDeleted'),
      description: t('settings.accountDeletedDescription'),
    });
    await signOut();
    navigate('/');
  };

  const handleCheckout = async (plan: 'basic' | 'pro') => {
    setCheckoutLoading(plan);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('settings.notAuthenticated'),
          description: t('settings.pleaseLogin'),
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          period: 'monthly',
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Checkout failed');
      }

      const { url } = response.data;
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: t('settings.checkoutError'),
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle referral link copy
  const handleCopyReferralLink = async () => {
    if (!referralCode) return;
    
    const link = `${getBaseUrl()}/?ref=${referralCode}`;
    
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle referral link share
  const handleShareReferralLink = async () => {
    if (!referralCode) return;
    
    const link = `${getBaseUrl()}/?ref=${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Crypto Signal Pro',
          text: 'Get AI-powered crypto trading signals!',
          url: link,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        if ((error as Error).name !== 'AbortError') {
          handleCopyReferralLink();
        }
      }
    } else {
      handleCopyReferralLink();
    }
  };

  // Handle notification toggle (DB)
  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    
    if (!user) return;
    
    try {
      await supabase
        .from('user_settings')
        .update({ notifications_enabled: enabled })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  // Handle sound toggle (localStorage)
  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('signal_sound', String(enabled));
  };

  // Request desktop notification permission
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Desktop notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive desktop notifications for new signals.',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const currentPlan = PLANS[effectivePlan];
  const priceDisplay = currentPlan.monthlyPrice === 0 ? '$0/mo' : `$${currentPlan.monthlyPrice}/mo`;
  
  // Format plan source display
  const getPlanSourceText = () => {
    if (planSource === 'stripe') return '(via subscription)';
    if (planSource === 'grant') return '(via grant)';
    return '';
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 mb-8">
        <div className="p-1.5 rounded-lg gradient-primary">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold gradient-text">CSP</span>
      </div>
      
      <nav className="space-y-2">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <BarChart3 className="h-5 w-5" />
          {t('nav.dashboard')}
        </Link>
        <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <History className="h-5 w-5" />
          {t('nav.history')}
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <SettingsIcon className="h-5 w-5" />
          {t('nav.settings')}
        </Link>
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-4">
        <LanguageSelector />
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" />
          {t('nav.signOut')}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-4 hidden md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-lg border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg gradient-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold gradient-text">CSP</span>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-4">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 p-6 pt-20 md:pt-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Account Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('settings.account')}</CardTitle>
                  <CardDescription>{t('settings.accountInfo')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t('settings.email')}</Label>
                <Input value={user?.email || ''} disabled className="mt-1 bg-background/50" />
              </div>
              <div>
                <Label className="text-muted-foreground">{t('settings.currentPlan')}</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {effectivePlan === 'pro' && <Crown className="h-5 w-5 text-yellow-500" />}
                    {effectivePlan === 'basic' && <Zap className="h-5 w-5 text-primary" />}
                    <span className="font-semibold text-lg">{currentPlan.name}</span>
                    <span className="text-muted-foreground">{priceDisplay}</span>
                    <span className="text-sm text-muted-foreground">{getPlanSourceText()}</span>
                  </div>
                </div>
                
                {/* Show grant expiration if applicable */}
                {planSource === 'grant' && grantExpiresAt && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Expires: {new Date(grantExpiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                )}
                
                {/* Upgrade CTAs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {effectivePlan === 'free' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => handleCheckout('basic')}
                        disabled={checkoutLoading !== null}
                      >
                        {checkoutLoading === 'basic' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        {t('settings.upgradeToBasic')}
                      </Button>
                      <Button 
                        size="sm" 
                        className="gradient-primary text-white gap-2"
                        onClick={() => handleCheckout('pro')}
                        disabled={checkoutLoading !== null}
                      >
                        {checkoutLoading === 'pro' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4" />
                        )}
                        {t('settings.goPro')}
                      </Button>
                    </>
                  )}
                  {effectivePlan === 'basic' && (
                    <Button 
                      size="sm" 
                      className="gradient-primary text-white gap-2"
                      onClick={() => handleCheckout('pro')}
                      disabled={checkoutLoading !== null}
                    >
                      {checkoutLoading === 'pro' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      {t('settings.upgradeToPro')}
                    </Button>
                  )}
                  {effectivePlan === 'pro' && (
                    <div className="flex items-center gap-2 text-success">
                      <Crown className="h-5 w-5" />
                      <span className="font-medium">{t('settings.youreOnBestPlan')}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invites & Rewards Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Invites & Rewards</CardTitle>
                  <CardDescription>Share your referral link and earn rewards</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Your Referral Link</Label>
                <div className="mt-2 flex gap-2">
                  <Input 
                    value={referralCode ? `${getBaseUrl()}/?ref=${referralCode}` : 'Loading...'} 
                    disabled 
                    className="bg-background/50 font-mono text-sm" 
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyReferralLink}
                    disabled={!referralCode || loadingReferral}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleShareReferralLink}
                    disabled={!referralCode || loadingReferral}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Invite friends and earn rewards when they upgrade their plan.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('settings.preferences')}</CardTitle>
                  <CardDescription>{t('settings.customizeExperience')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Signal Alerts Toggle (DB) */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Alerts</Label>
                  <p className="text-sm text-muted-foreground">Show toast notifications for new signals</p>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={handleNotificationsToggle} 
                />
              </div>
              
              {/* Sound Toggle (localStorage) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Enable Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when new signals arrive</p>
                  </div>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={handleSoundToggle} 
                />
              </div>
              
              {/* Desktop Notification Permission */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {notificationPermission === 'granted' 
                      ? 'Enabled - you will receive desktop notifications'
                      : notificationPermission === 'denied'
                      ? 'Blocked - enable in browser settings'
                      : 'Get notified even when the app is in background'
                    }
                  </p>
                </div>
                {notificationPermission === 'granted' ? (
                  <span className="text-sm text-green-500 font-medium">Enabled</span>
                ) : notificationPermission === 'denied' ? (
                  <span className="text-sm text-destructive font-medium">Blocked</span>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRequestNotificationPermission}
                  >
                    Enable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="glass border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">{t('settings.dangerZone')}</CardTitle>
                  <CardDescription>{t('settings.irreversibleActions')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.deleteAccount')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.deleteAccountDescription')}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      {t('common.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('settings.deleteConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('settings.deleteConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleting ? t('settings.deleting') : t('settings.yesDeleteAccount')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}