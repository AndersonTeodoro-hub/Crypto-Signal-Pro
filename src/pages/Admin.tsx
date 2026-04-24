import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, LogOut, Settings, BarChart3, History, Menu, Play, Clock, CheckCircle, XCircle, Loader2, Shield, Users, Target, Award, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { subDays } from 'date-fns';

interface GenerationResult {
  timeframe: string;
  timestamp: Date;
  success: boolean;
  processed: number;
  signalsCreated: number;
  results: Array<{
    pair: string;
    signal?: unknown;
    error?: string;
  }>;
  error?: string;
}

interface OutcomeUpdateResult {
  timestamp: Date;
  success: boolean;
  processed: number;
  updated: number;
  expired: number;
  error?: string;
}

interface GrowthMetrics {
  totalUsers: number;
  usersByPlan: { free: number; basic: number; pro: number };
  activeGrants: number;
  pendingReferrals: number;
  approvedReferrals: number;
}

interface SignalPerformance {
  total: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  tp1: number;
  tp2: number;
  tp3: number;
  byTimeframe: {
    '15m': { wins: number; losses: number };
    '1H': { wins: number; losses: number };
  };
}

export default function Admin() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [generating15m, setGenerating15m] = useState(false);
  const [generating1H, setGenerating1H] = useState(false);
  const [updatingOutcomes, setUpdatingOutcomes] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [outcomeHistory, setOutcomeHistory] = useState<OutcomeUpdateResult[]>([]);
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [performance7d, setPerformance7d] = useState<SignalPerformance | null>(null);
  const [performance30d, setPerformance30d] = useState<SignalPerformance | null>(null);
  const [performancePeriod, setPerformancePeriod] = useState<'7d' | '30d'>('7d');
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Fetch growth metrics on mount
  useEffect(() => {
    fetchGrowthMetrics();
    fetchSignalPerformance();
  }, []);

  const fetchGrowthMetrics = async () => {
    try {
      // Fetch total users and by plan
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('plan');
      
      if (profilesError) throw profilesError;
      
      const usersByPlan = { free: 0, basic: 0, pro: 0 };
      profiles?.forEach(p => {
        if (p.plan in usersByPlan) {
          usersByPlan[p.plan as keyof typeof usersByPlan]++;
        }
      });
      
      // Fetch active grants
      const now = new Date().toISOString();
      const { count: activeGrants } = await supabase
        .from('access_grants')
        .select('*', { count: 'exact', head: true })
        .lte('starts_at', now)
        .gte('expires_at', now);
      
      // Fetch referrals
      const { data: referrals } = await supabase
        .from('referrals')
        .select('status');
      
      const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
      const approvedReferrals = referrals?.filter(r => r.status === 'approved' || r.status === 'rewarded').length || 0;
      
      setMetrics({
        totalUsers: profiles?.length || 0,
        usersByPlan,
        activeGrants: activeGrants || 0,
        pendingReferrals,
        approvedReferrals
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchSignalPerformance = async () => {
    try {
      const now = new Date();
      const date7d = subDays(now, 7).toISOString();
      const date30d = subDays(now, 30).toISOString();
      
      // Fetch 7d performance
      const { data: signals7d } = await supabase
        .from('signals')
        .select('status, outcome_tp, timeframe')
        .gte('created_at', date7d);
      
      if (signals7d) {
        setPerformance7d(calculatePerformance(signals7d));
      }
      
      // Fetch 30d performance
      const { data: signals30d } = await supabase
        .from('signals')
        .select('status, outcome_tp, timeframe')
        .gte('created_at', date30d);
      
      if (signals30d) {
        setPerformance30d(calculatePerformance(signals30d));
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const calculatePerformance = (signals: Array<{ status: string; outcome_tp: number | null; timeframe: string }>): SignalPerformance => {
    const wins = signals.filter(s => s.status === 'hit_tp');
    const losses = signals.filter(s => s.status === 'hit_sl');
    const expired = signals.filter(s => s.status === 'expired');
    
    const totalDecided = wins.length + losses.length;
    const winRate = totalDecided > 0 ? (wins.length / totalDecided) * 100 : 0;
    
    return {
      total: signals.length,
      wins: wins.length,
      losses: losses.length,
      expired: expired.length,
      winRate,
      tp1: wins.filter(s => s.outcome_tp === 1).length,
      tp2: wins.filter(s => s.outcome_tp === 2).length,
      tp3: wins.filter(s => s.outcome_tp === 3).length,
      byTimeframe: {
        '15m': {
          wins: wins.filter(s => s.timeframe === '15m').length,
          losses: losses.filter(s => s.timeframe === '15m').length
        },
        '1H': {
          wins: wins.filter(s => s.timeframe === '1H').length,
          losses: losses.filter(s => s.timeframe === '1H').length
        }
      }
    };
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const generateSignals = async (timeframe: '15m' | '1H') => {
    const setLoading = timeframe === '15m' ? setGenerating15m : setGenerating1H;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('admin.sessionExpired'),
        });
        return;
      }

      const response = await supabase.functions.invoke('admin-generate-signals', {
        body: { timeframe }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      setHistory(prev => [{
        timeframe,
        timestamp: new Date(),
        success: true,
        processed: result.processed,
        signalsCreated: result.signalsCreated,
        results: result.results
      }, ...prev.slice(0, 9)]);

      toast({
        title: `✅ ${t('admin.generationComplete')}`,
        description: t('admin.signalsCreated', { created: result.signalsCreated, processed: result.processed }),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setHistory(prev => [{
        timeframe,
        timestamp: new Date(),
        success: false,
        processed: 0,
        signalsCreated: 0,
        results: [],
        error: errorMessage
      }, ...prev.slice(0, 9)]);

      toast({
        variant: 'destructive',
        title: t('admin.generationError'),
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const runOutcomeUpdater = async () => {
    setUpdatingOutcomes(true);

    try {
      const response = await supabase.functions.invoke('update-signal-outcomes', {
        body: { limit: 200 }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      setOutcomeHistory(prev => [{
        timestamp: new Date(),
        success: true,
        processed: result.processed,
        updated: result.updated,
        expired: result.expired
      }, ...prev.slice(0, 4)]);

      toast({
        title: `✅ ${t('admin.outcomesUpdated')}`,
        description: t('admin.outcomesUpdatedDescription', { 
          processed: result.processed, 
          updated: result.updated,
          expired: result.expired 
        }),
      });

      // Refresh performance stats
      fetchSignalPerformance();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setOutcomeHistory(prev => [{
        timestamp: new Date(),
        success: false,
        processed: 0,
        updated: 0,
        expired: 0,
        error: errorMessage
      }, ...prev.slice(0, 4)]);

      toast({
        variant: 'destructive',
        title: t('admin.outcomeUpdateError'),
        description: errorMessage,
      });
    } finally {
      setUpdatingOutcomes(false);
    }
  };

  const currentPerformance = performancePeriod === '7d' ? performance7d : performance30d;

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
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="h-5 w-5" />
          {t('nav.settings')}
        </Link>
        <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <Shield className="h-5 w-5" />
          {t('nav.admin')}
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
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>

        {/* Growth Metrics */}
        <Card className="glass border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.growthMetrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.totalUsers')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-center gap-2 mb-1">
                    <Badge variant="outline">F: {metrics.usersByPlan.free}</Badge>
                    <Badge variant="secondary">B: {metrics.usersByPlan.basic}</Badge>
                    <Badge className="bg-primary/20 text-primary">P: {metrics.usersByPlan.pro}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('admin.usersByPlan')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{metrics.activeGrants}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.activeGrants')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-warning/10">
                  <p className="text-2xl font-bold text-warning">{metrics.pendingReferrals}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.pendingReferrals')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{metrics.approvedReferrals}</p>
                  <p className="text-sm text-muted-foreground">{t('admin.approvedReferrals')}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Signal Performance */}
        <Card className="glass border-border/50 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('admin.signalPerformance')}
              </CardTitle>
              <Tabs value={performancePeriod} onValueChange={(v) => setPerformancePeriod(v as '7d' | '30d')}>
                <TabsList className="h-8">
                  <TabsTrigger value="7d" className="text-xs px-3">{t('admin.last7Days')}</TabsTrigger>
                  <TabsTrigger value="30d" className="text-xs px-3">{t('admin.last30Days')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {currentPerformance ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{currentPerformance.total}</p>
                    <p className="text-sm text-muted-foreground">{t('admin.totalSignals')}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <p className="text-2xl font-bold">{currentPerformance.winRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">{t('trackRecord.winRate')}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{currentPerformance.wins}</p>
                    <p className="text-sm text-muted-foreground">{t('trackRecord.wins')}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{currentPerformance.losses}</p>
                    <p className="text-sm text-muted-foreground">{t('trackRecord.losses')}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{currentPerformance.expired}</p>
                    <p className="text-sm text-muted-foreground">{t('trackRecord.expired')}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* TP Distribution */}
                  <div className="p-4 rounded-lg border border-border/50">
                    <p className="text-sm font-medium mb-2">{t('trackRecord.tpDistribution')}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-success/10">TP1: {currentPerformance.tp1}</Badge>
                      <Badge variant="outline" className="bg-success/20">TP2: {currentPerformance.tp2}</Badge>
                      <Badge variant="outline" className="bg-success/30">TP3: {currentPerformance.tp3}</Badge>
                    </div>
                  </div>
                  
                  {/* By Timeframe */}
                  <div className="p-4 rounded-lg border border-border/50">
                    <p className="text-sm font-medium mb-2">{t('admin.byTimeframe')}</p>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">15m: </span>
                        <span className="text-success">{currentPerformance.byTimeframe['15m'].wins}W</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">{currentPerformance.byTimeframe['15m'].losses}L</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">1H: </span>
                        <span className="text-success">{currentPerformance.byTimeframe['1H'].wins}W</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">{currentPerformance.byTimeframe['1H'].losses}L</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('admin.timeframe15m')}
              </CardTitle>
              <CardDescription>
                {t('admin.generateFor15m')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateSignals('15m')}
                disabled={generating15m || generating1H || updatingOutcomes}
                className="w-full"
              >
                {generating15m ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('admin.generating')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('admin.generateNow15m')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('admin.timeframe1H')}
              </CardTitle>
              <CardDescription>
                {t('admin.generateFor1H')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateSignals('1H')}
                disabled={generating15m || generating1H || updatingOutcomes}
                className="w-full"
              >
                {generating1H ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('admin.generating')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('admin.generateNow1H')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                {t('admin.outcomeUpdater')}
              </CardTitle>
              <CardDescription>
                {t('admin.runOutcomeUpdaterDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runOutcomeUpdater}
                disabled={generating15m || generating1H || updatingOutcomes}
                className="w-full"
                variant="secondary"
              >
                {updatingOutcomes ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('admin.updatingOutcomes')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('admin.runOutcomeUpdater')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>{t('admin.history')}</CardTitle>
            <CardDescription>
              {t('admin.historyDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 && outcomeHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.noExecutions')}
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Outcome updates */}
                  {outcomeHistory.map((item, index) => (
                    <Card key={`outcome-${index}`} className={`border ${item.success ? 'border-primary/50' : 'border-destructive/50'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <RefreshCw className="h-5 w-5 text-primary" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <Badge variant="secondary">Outcomes</Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {item.success && (
                            <div className="flex gap-2">
                              <Badge variant="outline">{item.processed} checked</Badge>
                              <Badge className="bg-success/20 text-success">{item.updated} updated</Badge>
                              <Badge variant="secondary">{item.expired} expired</Badge>
                            </div>
                          )}
                        </div>
                        {item.error && (
                          <p className="text-sm text-destructive">{item.error}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Signal generation */}
                  {history.map((item, index) => (
                    <Card key={index} className={`border ${item.success ? 'border-success/50' : 'border-destructive/50'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <Badge variant={item.timeframe === '15m' ? 'default' : 'secondary'}>
                              {item.timeframe}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {item.success && (
                            <Badge variant="outline">
                              {item.signalsCreated}/{item.processed} {t('admin.signals')}
                            </Badge>
                          )}
                        </div>
                        
                        {item.error && (
                          <p className="text-sm text-destructive mb-3">{item.error}</p>
                        )}

                        {item.success && item.results.length > 0 && (
                          <div className="space-y-1">
                            {item.results.slice(0, 5).map((result, idx) => (
                              <div key={idx} className="text-sm flex items-center gap-2">
                                {result.signal ? (
                                  <CheckCircle className="h-3 w-3 text-success" />
                                ) : (
                                  <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                                )}
                                <span className="font-mono">{result.pair}</span>
                                {result.error && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    ({result.error})
                                  </span>
                                )}
                              </div>
                            ))}
                            {item.results.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                {t('admin.andMore', { count: item.results.length - 5 })}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
