import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TrendingUp, LogOut, Settings as SettingsIcon, BarChart3, History, Menu, User, Bell, AlertTriangle, Crown, Zap, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { PLANS, type PlanType } from '@/lib/plans';
import { LanguageSelector } from '@/components/LanguageSelector';
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userPlan, setUserPlan] = useState<PlanType>('free');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<'basic' | 'pro' | null>(null);

  // Check for success/canceled params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast({
        title: `🎉 ${t('settings.paymentSuccess')}`,
        description: t('settings.paymentSuccessDescription'),
      });
      // Reload plan after successful payment
      setTimeout(() => loadUserPlan(), 1000);
    } else if (canceled === 'true') {
      toast({
        title: t('settings.paymentCanceled'),
        description: t('settings.paymentCanceledDescription'),
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, t]);

  const loadUserPlan = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data?.plan && (data.plan === 'free' || data.plan === 'basic' || data.plan === 'pro')) {
        setUserPlan(data.plan as PlanType);
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadUserPlan();
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

  const currentPlan = PLANS[userPlan];
  const priceDisplay = currentPlan.monthlyPrice === 0 ? '$0/mo' : `$${currentPlan.monthlyPrice}/mo`;

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
                    {userPlan === 'pro' && <Crown className="h-5 w-5 text-yellow-500" />}
                    {userPlan === 'basic' && <Zap className="h-5 w-5 text-primary" />}
                    <span className="font-semibold text-lg">{currentPlan.name}</span>
                    <span className="text-muted-foreground">{priceDisplay}</span>
                  </div>
                </div>
                
                {/* Upgrade CTAs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {userPlan === 'free' && (
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
                  {userPlan === 'basic' && (
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
                  {userPlan === 'pro' && (
                    <div className="flex items-center gap-2 text-success">
                      <Crown className="h-5 w-5" />
                      <span className="font-medium">{t('settings.youreOnBestPlan')}</span>
                    </div>
                  )}
                </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('settings.notifications')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.notificationsDescription')}</p>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={setNotificationsEnabled} 
                />
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
