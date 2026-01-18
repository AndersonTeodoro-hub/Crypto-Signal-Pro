import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, LogOut, Settings, BarChart3, History, Menu, Lock, Crown, User, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PairSelector } from '@/components/signals/PairSelector';
import { SignalCard } from '@/components/signals/SignalCard';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Badge } from '@/components/ui/badge';
import { LanguageSelector } from '@/components/LanguageSelector';
import { playSignalSound, showBrowserNotification } from '@/lib/sounds';
import type { SignalWithPair } from '@/types/database';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { effectivePlan, loading: planLoading, canAccessTimeframe, isFree, isAdmin } = useUserPlan();
  
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('4H');
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load user settings
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSelectedPair(data.selected_pair_id);
        // Ensure the timeframe is accessible for the user's plan
        const savedTimeframe = data.timeframe;
        if (canAccessTimeframe(savedTimeframe)) {
          setTimeframe(savedTimeframe);
        } else {
          setTimeframe('4H'); // Default to 4H for free users
        }
      }
      setLoading(false);
    }

    if (!planLoading) {
      loadSettings();
    }
  }, [user, planLoading, canAccessTimeframe]);

  // Save settings when changed
  useEffect(() => {
    async function saveSettings() {
      if (!user || loading) return;

      setSavingSettings(true);
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          selected_pair_id: selectedPair,
          timeframe: timeframe,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      setSavingSettings(false);
    }

    if (selectedPair !== null || timeframe) {
      saveSettings();
    }
  }, [selectedPair, timeframe, user, loading]);

  // Fetch signals
  useEffect(() => {
    async function fetchSignals() {
      if (!selectedPair) {
        setSignals([]);
        return;
      }

      const { data, error } = await supabase
        .from('signals')
        .select(`
          *,
          allowed_pairs (*)
        `)
        .eq('pair_id', selectedPair)
        .eq('timeframe', timeframe)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setSignals(data as SignalWithPair[]);
      }
    }

    fetchSignals();
  }, [selectedPair, timeframe]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedPair) return;

    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: `pair_id=eq.${selectedPair}`,
        },
        async (payload) => {
          // Fetch the new signal with pair data
          const { data } = await supabase
            .from('signals')
            .select(`*, allowed_pairs (*)`)
            .eq('id', payload.new.id)
            .single();

          if (data && data.timeframe === timeframe) {
            setSignals((prev) => [data as SignalWithPair, ...prev]);
            
            const signalData = data as SignalWithPair;
            const pairSymbol = signalData.allowed_pairs?.symbol || 'Signal';
            const direction = signalData.direction === 'LONG' ? 'BUY' : 'SELL';
            
            // Show toast
            toast({
              title: `🚀 ${t('dashboard.newSignal')}`,
              description: `${pairSymbol} - ${direction} (${signalData.timeframe}) Grade ${signalData.grade}`,
            });
            
            // Play sound if enabled (defaults to true)
            const soundEnabled = localStorage.getItem('signal_sound') !== 'false';
            if (soundEnabled) {
              playSignalSound();
            }
            
            // Show browser notification
            showBrowserNotification(
              `New Signal: ${pairSymbol}`,
              `${direction} (${signalData.timeframe}) - Grade ${signalData.grade}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPair, timeframe, toast, t]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleTimeframeChange = (value: string) => {
    if (canAccessTimeframe(value)) {
      setTimeframe(value);
    } else {
      toast({
        title: t('dashboard.upgradeRequired'),
        description: t('dashboard.upgradeRequired1H'),
        variant: 'destructive',
      });
    }
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
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <BarChart3 className="h-5 w-5" />
          {t('nav.dashboard')}
        </Link>
        <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <History className="h-5 w-5" />
          {t('nav.history')}
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <User className="h-5 w-5" />
          {t('nav.profile')}
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="h-5 w-5" />
          {t('nav.settings')}
        </Link>
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Shield className="h-5 w-5" />
            {t('nav.admin')}
          </Link>
        )}
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard.welcome')}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Badge variant="outline" className="capitalize">
            {effectivePlan} {t('dashboard.plan')}
          </Badge>
        </div>

        {/* Plan Limit Notice for Free Users */}
        {isFree && (
          <Card className="glass border-primary/30 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t('dashboard.freePlanLimit')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.upgradeToUnlock')}</p>
                  </div>
                </div>
                <Link to="/settings">
                  <Button size="sm" className="gradient-primary text-white">
                    {t('pricing.upgrade')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Card */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle>{t('dashboard.configuration')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('dashboard.pair')}
                  {isFree && <span className="text-xs ml-2">{t('dashboard.pairLimit')}</span>}
                </label>
                <PairSelector 
                  value={selectedPair} 
                  onValueChange={setSelectedPair}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  {t('dashboard.timeframe')}
                </label>
                <Tabs value={timeframe} onValueChange={handleTimeframeChange}>
                  <TabsList className="w-full">
                    <TabsTrigger 
                      value="1H" 
                      className="flex-1 relative"
                      disabled={!canAccessTimeframe('1H')}
                    >
                      1H
                      {!canAccessTimeframe('1H') && (
                        <Lock className="h-3 w-3 ml-1 opacity-50" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="4H" className="flex-1">4H</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('dashboard.signals')}</h2>
          
          {!selectedPair ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('dashboard.selectPair')}</p>
                </div>
              </CardContent>
            </Card>
          ) : signals.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('dashboard.noSignals')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard.newSignalsRealtime')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
