import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, LogOut, Settings, BarChart3, History as HistoryIcon, Menu, Filter, Calendar, Crown, Target, XCircle, AlertCircle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SignalCard } from '@/components/signals/SignalCard';
import { useUserPlan } from '@/hooks/useUserPlan';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SignalWithPair, AllowedPair } from '@/types/database';
import { subDays } from 'date-fns';

export default function History() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plan, limits, isFree, isBasic } = useUserPlan();
  
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [pairs, setPairs] = useState<AllowedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');

  // Get the date limit based on plan
  const getHistoryDateLimit = (): Date | null => {
    if (limits.historyDays === null) return null; // Pro - unlimited
    return subDays(new Date(), limits.historyDays);
  };

  // Performance stats
  const stats = useMemo(() => {
    const wins = signals.filter(s => s.status === 'hit_tp');
    const losses = signals.filter(s => s.status === 'hit_sl');
    const expired = signals.filter(s => s.status === 'expired');
    const active = signals.filter(s => s.status === 'active');
    
    const totalDecided = wins.length + losses.length;
    const winRate = totalDecided > 0 ? (wins.length / totalDecided) * 100 : 0;
    
    // TP distribution
    const tp1 = wins.filter(s => s.outcome_tp === 1).length;
    const tp2 = wins.filter(s => s.outcome_tp === 2).length;
    const tp3 = wins.filter(s => s.outcome_tp === 3).length;
    
    // Timeframe breakdown
    const wins1H = wins.filter(s => s.timeframe === '1H').length;
    const losses1H = losses.filter(s => s.timeframe === '1H').length;
    const wins4H = wins.filter(s => s.timeframe === '4H').length;
    const losses4H = losses.filter(s => s.timeframe === '4H').length;
    
    // Average PnL
    const winsPnl = wins.reduce((sum, s) => sum + (s.pnl_percent || 0), 0);
    const lossesPnl = losses.reduce((sum, s) => sum + (s.pnl_percent || 0), 0);
    const avgWinPnl = wins.length > 0 ? winsPnl / wins.length : 0;
    const avgLossPnl = losses.length > 0 ? lossesPnl / losses.length : 0;
    
    return {
      total: signals.length,
      wins: wins.length,
      losses: losses.length,
      expired: expired.length,
      active: active.length,
      winRate,
      tp1, tp2, tp3,
      wins1H, losses1H, wins4H, losses4H,
      avgWinPnl,
      avgLossPnl
    };
  }, [signals]);

  useEffect(() => {
    async function fetchPairs() {
      const { data } = await supabase
        .from('allowed_pairs')
        .select('*')
        .eq('is_active', true)
        .order('rank');
      
      if (data) setPairs(data);
    }
    fetchPairs();
  }, []);

  useEffect(() => {
    async function fetchSignals() {
      setLoading(true);
      
      let query = supabase
        .from('signals')
        .select(`*, allowed_pairs (*)`)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply date filter based on plan
      const dateLimit = getHistoryDateLimit();
      if (dateLimit) {
        query = query.gte('created_at', dateLimit.toISOString());
      }

      if (filterPair !== 'all') {
        query = query.eq('pair_id', filterPair);
      }
      if (filterDirection !== 'all') {
        query = query.eq('direction', filterDirection);
      }
      if (filterTimeframe !== 'all') {
        query = query.eq('timeframe', filterTimeframe);
      }
      if (filterOutcome !== 'all') {
        query = query.eq('status', filterOutcome);
      }

      const { data, error } = await query;

      if (!error && data) {
        setSignals(data as SignalWithPair[]);
      }
      setLoading(false);
    }

    fetchSignals();
  }, [filterPair, filterDirection, filterTimeframe, filterOutcome, limits.historyDays]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getHistoryLimitText = (): string => {
    if (limits.historyDays === null) return t('history.unlimited');
    if (limits.historyDays === 7) return t('history.last7Days');
    if (limits.historyDays === 30) return t('history.last30Days');
    return `${limits.historyDays} days`;
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
        <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <HistoryIcon className="h-5 w-5" />
          {t('nav.history')}
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="h-5 w-5" />
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('history.title')}</h1>
            <p className="text-muted-foreground">{t('history.subtitle')}</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {getHistoryLimitText()}
          </Badge>
        </div>

        {/* Upgrade Notice for Limited Plans */}
        {(isFree || isBasic) && (
          <Card className="glass border-primary/30 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {isFree ? t('history.freePlanHistory') : t('history.basicPlanHistory')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isFree ? t('history.upgradeBasic30Days') : t('history.upgradePro')}
                    </p>
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

        {/* Performance Stats */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              {t('trackRecord.performance')}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{t('trackRecord.disclaimer')}</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">{t('trackRecord.winRate')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">{stats.wins}</p>
                <p className="text-sm text-muted-foreground">{t('trackRecord.wins')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{stats.losses}</p>
                <p className="text-sm text-muted-foreground">{t('trackRecord.losses')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">{t('trackRecord.expired')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{stats.active}</p>
                <p className="text-sm text-muted-foreground">{t('trackRecord.active')}</p>
              </div>
            </div>
            
            {/* TP Distribution */}
            {stats.wins > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-2">{t('trackRecord.tpDistribution')}</p>
                <div className="flex gap-4">
                  <Badge variant="outline" className="bg-success/10">TP1: {stats.tp1}</Badge>
                  <Badge variant="outline" className="bg-success/20">TP2: {stats.tp2}</Badge>
                  <Badge variant="outline" className="bg-success/30">TP3: {stats.tp3}</Badge>
                </div>
              </div>
            )}
            
            {/* Timeframe Breakdown */}
            {(stats.wins > 0 || stats.losses > 0) && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-2">{t('trackRecord.byTimeframe')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="font-medium text-sm mb-1">1H</p>
                    <div className="flex gap-3 text-sm">
                      <span className="text-success">W: {stats.wins1H}</span>
                      <span className="text-destructive">L: {stats.losses1H}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20">
                    <p className="font-medium text-sm mb-1">4H</p>
                    <div className="flex gap-3 text-sm">
                      <span className="text-success">W: {stats.wins4H}</span>
                      <span className="text-destructive">L: {stats.losses4H}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              {t('history.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('dashboard.pair')}</label>
                <Select value={filterPair} onValueChange={setFilterPair}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder={t('history.allPairs')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('history.allPairs')}</SelectItem>
                    {pairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('history.direction')}</label>
                <Select value={filterDirection} onValueChange={setFilterDirection}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder={t('history.allDirections')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('history.allDirections')}</SelectItem>
                    <SelectItem value="LONG">{t('history.buy')}</SelectItem>
                    <SelectItem value="SHORT">{t('history.sell')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('history.timeframe')}</label>
                <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder={t('history.allTimeframes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('history.allTimeframes')}</SelectItem>
                    <SelectItem value="1H">1H</SelectItem>
                    <SelectItem value="4H">4H</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('trackRecord.outcome')}</label>
                <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder={t('history.allOutcomes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('history.allOutcomes')}</SelectItem>
                    <SelectItem value="hit_tp">{t('trackRecord.wins')}</SelectItem>
                    <SelectItem value="hit_sl">{t('trackRecord.losses')}</SelectItem>
                    <SelectItem value="expired">{t('trackRecord.expired')}</SelectItem>
                    <SelectItem value="active">{t('trackRecord.active')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Info className="h-4 w-4 flex-shrink-0" />
          <p>{t('trackRecord.disclaimer')}</p>
        </div>

        {/* Signals List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('history.loading')}</p>
              </CardContent>
            </Card>
          ) : signals.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('history.noSignals')}</p>
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
