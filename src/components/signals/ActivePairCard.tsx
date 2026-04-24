import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculatePercentages, formatPercent, formatPrice, getTimeAgo } from '@/lib/signalCalculations';

interface Signal {
  id: string;
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
}

interface ActivePairCardProps {
  symbol: string;
  pairName: string;
  signal15m: Signal | null;
  signal1H: Signal | null;
  visibleTimeframes?: 'all' | '15m' | '1H';
  onClick?: () => void;
  isLoading?: boolean;
}

function SignalBlock({ signal, timeframe }: { signal: Signal | null; timeframe: string }) {
  const { t, language } = useLanguage();

  // Calculate percentages even if signal is null (will use dummy values)
  const percentages = useMemo(() => {
    if (!signal) return null;
    return calculatePercentages(
      signal.direction as 'LONG' | 'SHORT',
      signal.entry_price,
      signal.stop_loss,
      signal.take_profit_1,
      signal.take_profit_2,
      signal.take_profit_3
    );
  }, [signal]);

  if (!signal || !percentages) {
    return (
      <div className="flex-1 p-3 rounded-lg bg-muted/30 border border-border/30">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">{timeframe}</Badge>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          {t('activePairs.noSignal')}
        </p>
      </div>
    );
  }

  const isLong = signal.direction === 'LONG';
  const statusColors = {
    active: 'bg-primary/20 text-primary border-primary/30',
    hit_tp: 'bg-success/20 text-success border-success/30',
    hit_sl: 'bg-destructive/20 text-destructive border-destructive/30',
    expired: 'bg-muted text-muted-foreground border-border'
  };

  const getStatusLabel = () => {
    if (signal.status === 'active') return t('activePairs.open');
    if (signal.status === 'hit_tp') {
      if (signal.outcome_tp === 1) return t('activePairs.tp1Hit');
      if (signal.outcome_tp === 2) return t('activePairs.tp2Hit');
      if (signal.outcome_tp === 3) return t('activePairs.tp3Hit');
      return t('activePairs.tp1Hit');
    }
    if (signal.status === 'hit_sl') return t('activePairs.stopHit');
    return signal.status;
  };

  return (
    <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-xs font-medium">{timeframe}</Badge>
        <Badge 
          variant="outline" 
          className={`text-xs ${isLong ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}`}
        >
          {isLong ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {isLong ? t('signal.buy') : t('signal.sell')}
        </Badge>
      </div>

      {/* Entry Price */}
      <div className="mb-2">
        <span className="text-xs text-muted-foreground">{t('activePairs.entry')}</span>
        <p className="font-mono font-semibold text-sm">{formatPrice(signal.entry_price)}</p>
      </div>

      {/* SL */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{t('activePairs.stopLoss')}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono">{formatPrice(signal.stop_loss)}</span>
          <span className="text-destructive font-medium">{formatPercent(percentages.slPercent)}</span>
          <span className="text-muted-foreground">(2x: {formatPercent(percentages.slPercent2x)})</span>
        </div>
      </div>

      {/* TPs */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">TP1</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatPrice(signal.take_profit_1)}</span>
            <span className="text-success font-medium">{formatPercent(percentages.tp1Percent)}</span>
            <span className="text-muted-foreground">(2x: {formatPercent(percentages.tp1Percent2x)})</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">TP2</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatPrice(signal.take_profit_2)}</span>
            <span className="text-success font-medium">{formatPercent(percentages.tp2Percent)}</span>
            <span className="text-muted-foreground">(2x: {formatPercent(percentages.tp2Percent2x)})</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">TP3</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatPrice(signal.take_profit_3)}</span>
            <span className="text-success font-medium">{formatPercent(percentages.tp3Percent)}</span>
            <span className="text-muted-foreground">(2x: {formatPercent(percentages.tp3Percent2x)})</span>
          </div>
        </div>
      </div>

      {/* Status and Time */}
      <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between">
        <Badge variant="outline" className={`text-xs ${statusColors[signal.status as keyof typeof statusColors] || statusColors.active}`}>
          {getStatusLabel()}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {getTimeAgo(signal.created_at, language)}
        </div>
      </div>
    </div>
  );
}

export function ActivePairCard({
  symbol,
  pairName,
  signal15m,
  signal1H,
  visibleTimeframes = 'all',
  onClick,
  isLoading = false
}: ActivePairCardProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-48" />
            <Skeleton className="flex-1 h-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine if card has any active signal
  const hasActiveSignal = signal15m?.status === 'active' || signal1H?.status === 'active';
  const hasTpHit = signal15m?.status === 'hit_tp' || signal1H?.status === 'hit_tp';

  return (
    <Card 
      className={`glass border-border/50 transition-all hover:border-primary/30 cursor-pointer ${
        hasActiveSignal ? 'ring-1 ring-primary/30' : hasTpHit ? 'ring-1 ring-success/20' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{symbol}</h3>
            <p className="text-sm text-muted-foreground">{pairName}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {(visibleTimeframes === 'all' || visibleTimeframes === '15m') && (
            <SignalBlock signal={signal15m} timeframe="15m" />
          )}
          {(visibleTimeframes === 'all' || visibleTimeframes === '1H') && (
            <SignalBlock signal={signal1H} timeframe="1H" />
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {t('activePairs.leverageNote')}
        </p>
      </CardContent>
    </Card>
  );
}

export function ActivePairCardSkeleton() {
  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-48" />
          <Skeleton className="flex-1 h-48" />
        </div>
      </CardContent>
    </Card>
  );
}
