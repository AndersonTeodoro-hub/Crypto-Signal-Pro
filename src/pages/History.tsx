import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, LogOut, Settings, BarChart3, History as HistoryIcon, Menu, Filter, Calendar, Crown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SignalCard } from '@/components/signals/SignalCard';
import { useUserPlan } from '@/hooks/useUserPlan';
import type { SignalWithPair, AllowedPair } from '@/types/database';
import { format, subDays } from 'date-fns';

export default function History() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { plan, limits, isFree, isBasic } = useUserPlan();
  
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [pairs, setPairs] = useState<AllowedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');

  // Stats
  const totalSignals = signals.length;
  const buySignals = signals.filter(s => s.direction === 'LONG').length;
  const sellSignals = signals.filter(s => s.direction === 'SHORT').length;

  // Get the date limit based on plan
  const getHistoryDateLimit = (): Date | null => {
    if (limits.historyDays === null) return null; // Pro - unlimited
    return subDays(new Date(), limits.historyDays);
  };

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
        .limit(50);

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

      const { data, error } = await query;

      if (!error && data) {
        setSignals(data as SignalWithPair[]);
      }
      setLoading(false);
    }

    fetchSignals();
  }, [filterPair, filterDirection, filterTimeframe, limits.historyDays]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getHistoryLimitText = (): string => {
    if (limits.historyDays === null) return 'Unlimited';
    return `Last ${limits.historyDays} days`;
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
          Dashboard
        </Link>
        <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <HistoryIcon className="h-5 w-5" />
          History
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
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
            <h1 className="text-2xl font-bold">Signal History</h1>
            <p className="text-muted-foreground">View all generated signals</p>
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
                      {isFree ? 'Free Plan: 7-day history' : 'Basic Plan: 30-day history'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isFree ? 'Upgrade to Basic for 30 days or Pro for unlimited history' : 'Upgrade to Pro for unlimited history'}
                    </p>
                  </div>
                </div>
                <Link to="/settings">
                  <Button size="sm" className="gradient-primary text-white">
                    Upgrade
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="glass border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalSignals}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{buySignals}</p>
              <p className="text-sm text-muted-foreground">Buy</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{sellSignals}</p>
              <p className="text-sm text-muted-foreground">Sell</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Pair</label>
                <Select value={filterPair} onValueChange={setFilterPair}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="All pairs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pairs</SelectItem>
                    {pairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Direction</label>
                <Select value={filterDirection} onValueChange={setFilterDirection}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="LONG">Buy</SelectItem>
                    <SelectItem value="SHORT">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Timeframe</label>
                <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1H">1H</SelectItem>
                    <SelectItem value="4H">4H</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading signals...</p>
              </CardContent>
            </Card>
          ) : signals.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No signals found with the selected filters.</p>
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
