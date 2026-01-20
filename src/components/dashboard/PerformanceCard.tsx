import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, HelpCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTimeAgo } from '@/lib/signalCalculations';
import { CalculationModal } from './CalculationModal';

interface PerformanceStats {
  tp1_hits_24h: number;
  tp2_hits_24h: number;
  tp3_hits_24h: number;
  stops_24h: number;
  open_24h: number;
  win_rate_24h: number;
  tp1_hits_7d: number;
  tp2_hits_7d: number;
  tp3_hits_7d: number;
  stops_7d: number;
  open_7d: number;
  win_rate_7d: number;
  tp1_hits_30d: number;
  tp2_hits_30d: number;
  tp3_hits_30d: number;
  stops_30d: number;
  open_30d: number;
  win_rate_30d: number;
  last_updated: string | null;
}

export function PerformanceCard() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('24h');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('performance_stats')
      .select('*')
      .single();

    if (!error && data) {
      setStats(data as PerformanceStats);
    }
    setLoading(false);
  };

  const getStatsForPeriod = (period: string) => {
    if (!stats) return null;
    
    switch (period) {
      case '24h':
        return {
          tp1: stats.tp1_hits_24h,
          tp2: stats.tp2_hits_24h,
          tp3: stats.tp3_hits_24h,
          stops: stats.stops_24h,
          open: stats.open_24h,
          winRate: stats.win_rate_24h
        };
      case '7d':
        return {
          tp1: stats.tp1_hits_7d,
          tp2: stats.tp2_hits_7d,
          tp3: stats.tp3_hits_7d,
          stops: stats.stops_7d,
          open: stats.open_7d,
          winRate: stats.win_rate_7d
        };
      case '30d':
        return {
          tp1: stats.tp1_hits_30d,
          tp2: stats.tp2_hits_30d,
          tp3: stats.tp3_hits_30d,
          stops: stats.stops_30d,
          open: stats.open_30d,
          winRate: stats.win_rate_30d
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const periodStats = getStatsForPeriod(activeTab);

  return (
    <>
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t('performance.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              {stats?.last_updated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {getTimeAgo(stats.last_updated, language)}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => setShowModal(true)}
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                {t('performance.howWeCalculate')}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('performance.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
            </TabsList>

            {periodStats && (
              <div className="space-y-4">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <p className="text-lg font-bold text-success">{periodStats.tp1}</p>
                    <p className="text-xs text-muted-foreground">TP1</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/20">
                    <p className="text-lg font-bold text-success">{periodStats.tp2}</p>
                    <p className="text-xs text-muted-foreground">TP2</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/30">
                    <p className="text-lg font-bold text-success">{periodStats.tp3}</p>
                    <p className="text-xs text-muted-foreground">TP3</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <p className="text-lg font-bold text-destructive">{periodStats.stops}</p>
                    <p className="text-xs text-muted-foreground">{t('performance.stops')}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/10">
                    <p className="text-lg font-bold text-primary">{periodStats.open}</p>
                    <p className="text-xs text-muted-foreground">{t('performance.open')}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{periodStats.winRate}%</p>
                    <p className="text-xs text-muted-foreground">{t('performance.winRate')}</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex justify-end">
                  <Link to={`/history?range=${activeTab}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('performance.verifiedHistory')}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <CalculationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
