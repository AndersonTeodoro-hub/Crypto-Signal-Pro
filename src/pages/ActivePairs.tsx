import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TrendingUp, LogOut, Settings, BarChart3, History, Menu, User, Shield, Grid3X3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUserPlan } from '@/hooks/useUserPlan';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AlertsDropdown } from '@/components/alerts/AlertsDropdown';
import { ActivePairCard, ActivePairCardSkeleton } from '@/components/signals/ActivePairCard';
import { ActivePairsFilters } from '@/components/signals/ActivePairsFilters';
import { PairDetailModal } from '@/components/signals/PairDetailModal';
import { getAllowedPairSymbols } from '@/lib/planPairs';
import type { PlanType } from '@/lib/plans';

interface Signal {
  id: string;
  pair_id: string;
  timeframe: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  status: string;
  outcome_tp: number | null;
  grade: string;
  created_at: string;
  symbol: string;
  pair_name: string;
  pair_rank: number;
}

interface PairWithSignals {
  pairId: string;
  symbol: string;
  pairName: string;
  rank: number;
  signal1H: Signal | null;
  signal4H: Signal | null;
}

export default function ActivePairs() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { effectivePlan, loading: planLoading, isAdmin } = useUserPlan();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [allPairs, setAllPairs] = useState<{ id: string; symbol: string; name: string; rank: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | '1H' | '4H'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [selectedPair, setSelectedPair] = useState<{ id: string; symbol: string; name: string } | null>(null);

  // Fetch signals and pairs
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch latest signals by pair
      const { data: signalsData } = await supabase
        .from('latest_signals_by_pair')
        .select('*');

      if (signalsData) {
        setSignals(signalsData as Signal[]);
      }

      // Fetch all active pairs
      const { data: pairsData } = await supabase
        .from('allowed_pairs')
        .select('id, symbol, name, rank')
        .eq('is_active', true)
        .order('rank');

      if (pairsData) {
        setAllPairs(pairsData);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  // Build pairs with signals based on plan
  const pairsWithSignals = useMemo(() => {
    const allowedSymbols = getAllowedPairSymbols(effectivePlan as PlanType);
    
    // Filter pairs based on plan
    let filteredPairs = allPairs;
    if (allowedSymbols !== null) {
      filteredPairs = allPairs.filter(p => allowedSymbols.includes(p.symbol));
    } else {
      // Pro gets up to 50 pairs
      filteredPairs = allPairs.slice(0, 50);
    }

    // Build pair objects with their signals
    return filteredPairs.map(pair => {
      const signal1H = signals.find(s => s.pair_id === pair.id && s.timeframe === '1H') || null;
      const signal4H = signals.find(s => s.pair_id === pair.id && s.timeframe === '4H') || null;

      return {
        pairId: pair.id,
        symbol: pair.symbol,
        pairName: pair.name,
        rank: pair.rank,
        signal1H,
        signal4H
      };
    });
  }, [allPairs, signals, effectivePlan]);

  // Apply filters
  const filteredPairs = useMemo(() => {
    let result = pairsWithSignals;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.symbol.toLowerCase().includes(query) ||
        p.pairName.toLowerCase().includes(query)
      );
    }

    // Timeframe filter
    if (timeframeFilter !== 'all') {
      result = result.filter(p => {
        const signal = timeframeFilter === '1H' ? p.signal1H : p.signal4H;
        return signal !== null;
      });
    }

    // Open filter
    if (showOnlyOpen) {
      result = result.filter(p => {
        if (timeframeFilter === '1H') return p.signal1H?.status === 'active';
        if (timeframeFilter === '4H') return p.signal4H?.status === 'active';
        return p.signal1H?.status === 'active' || p.signal4H?.status === 'active';
      });
    }

    // Sort: ACTIVE first, then HIT_TP, then HIT_SL, then no signal
    const statusOrder: Record<string, number> = { active: 0, hit_tp: 1, hit_sl: 2 };
    
    return result.sort((a, b) => {
      const getStatus = (p: PairWithSignals) => {
        const s1H = p.signal1H?.status || 'none';
        const s4H = p.signal4H?.status || 'none';
        return Math.min(statusOrder[s1H] ?? 3, statusOrder[s4H] ?? 3);
      };

      const orderA = getStatus(a);
      const orderB = getStatus(b);

      if (orderA !== orderB) return orderA - orderB;

      // Within OPEN, sort by most recent
      if (showOnlyOpen) {
        const dateA = Math.max(
          new Date(a.signal1H?.created_at || 0).getTime(),
          new Date(a.signal4H?.created_at || 0).getTime()
        );
        const dateB = Math.max(
          new Date(b.signal1H?.created_at || 0).getTime(),
          new Date(b.signal4H?.created_at || 0).getTime()
        );
        return dateB - dateA;
      }

      return a.rank - b.rank;
    });
  }, [pairsWithSignals, showOnlyOpen, timeframeFilter, searchQuery]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCardClick = (pair: PairWithSignals) => {
    setSelectedPair({ id: pair.pairId, symbol: pair.symbol, name: pair.pairName });
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
        <Link to="/active-pairs" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <Grid3X3 className="h-5 w-5" />
          {t('nav.activePairs')}
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

  // Empty state when showing only OPEN but none found
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('activePairs.noOpenSignals')}
      </h3>
      
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        {timeframeFilter === '1H' 
          ? t('activePairs.noOpenSignalsHint1H')
          : timeframeFilter === '4H'
          ? t('activePairs.noOpenSignalsHint4H')
          : t('activePairs.noOpenSignalsHintAll')}
      </p>
      
      <div className="flex gap-3">
        {timeframeFilter === '1H' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setTimeframeFilter('4H')}
          >
            {t('activePairs.view4H')}
          </Button>
        )}
        {timeframeFilter === '4H' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setTimeframeFilter('1H')}
          >
            {t('activePairs.view1H')}
          </Button>
        )}
        <Button 
          variant="default" 
          size="sm"
          onClick={() => {
            setShowOnlyOpen(false);
            setTimeframeFilter('all');
          }}
        >
          {t('activePairs.showAll')}
        </Button>
      </div>
    </div>
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
        {/* Header with Alerts */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{t('activePairs.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('activePairs.subtitle')}</p>
          </div>
          <AlertsDropdown />
        </div>

        {/* Filters Header */}
        <ActivePairsFilters
          showOnlyOpen={showOnlyOpen}
          onShowOnlyOpenChange={setShowOnlyOpen}
          timeframeFilter={timeframeFilter}
          onTimeframeFilterChange={setTimeframeFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          resultCount={filteredPairs.length}
          plan={effectivePlan as 'free' | 'basic' | 'pro'}
        />

        {/* Grid */}
        <div className="mt-6">
          {loading || planLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <ActivePairCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPairs.length === 0 && showOnlyOpen ? (
            renderEmptyState()
          ) : filteredPairs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('dashboard.noSignals')}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPairs.map((pair) => (
                <ActivePairCard
                  key={pair.pairId}
                  symbol={pair.symbol}
                  pairName={pair.pairName}
                  signal1H={pair.signal1H}
                  signal4H={pair.signal4H}
                  visibleTimeframes={timeframeFilter}
                  onClick={() => handleCardClick(pair)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedPair && (
        <PairDetailModal
          isOpen={!!selectedPair}
          onClose={() => setSelectedPair(null)}
          pairId={selectedPair.id}
          symbol={selectedPair.symbol}
          pairName={selectedPair.name}
        />
      )}
    </div>
  );
}
