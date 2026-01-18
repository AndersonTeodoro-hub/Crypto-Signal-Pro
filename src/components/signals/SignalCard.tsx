import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Clock, ExternalLink, Target, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignalWithPair } from '@/types/database';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS, ptBR, es } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface SignalCardProps {
  signal: SignalWithPair;
}

const dateLocales = { en: enUS, pt: ptBR, es: es };

export function SignalCard({ signal }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t, language } = useLanguage();
  
  const isBuy = signal.direction === 'LONG';
  const DirectionIcon = isBuy ? TrendingUp : TrendingDown;

  const gradeColors: Record<string, string> = {
    'A+': 'bg-success/20 text-success border-success/30',
    'A': 'bg-success/20 text-success border-success/30',
    'B+': 'bg-warning/20 text-warning border-warning/30',
    'B': 'bg-warning/20 text-warning border-warning/30',
    'C': 'bg-muted/50 text-muted-foreground border-muted/50',
  };

  // Outcome status display
  const getOutcomeBadge = () => {
    switch (signal.status) {
      case 'hit_tp':
        return (
          <Badge className="bg-success/20 text-success border-success/30 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            TP{signal.outcome_tp} {t('trackRecord.hit')}
          </Badge>
        );
      case 'hit_sl':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t('trackRecord.slHit')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('trackRecord.expired')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {t('trackRecord.active')}
          </Badge>
        );
    }
  };

  // Get TradingView link
  const getTradingViewUrl = () => {
    const symbol = signal.allowed_pairs?.symbol?.replace('/', '') || 'BTCUSDT';
    return `https://www.tradingview.com/chart/?symbol=BYBIT:${symbol}`;
  };

  // Format PnL display
  const formatPnL = (pnl: number | null) => {
    if (pnl === null) return null;
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(2)}%`;
  };

  return (
    <Card className={cn('glass overflow-hidden transition-all duration-300', isBuy ? 'border-l-4 border-l-success' : 'border-l-4 border-l-destructive')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isBuy ? 'bg-success/20' : 'bg-destructive/20')}>
              <DirectionIcon className={cn('h-5 w-5', isBuy ? 'text-success' : 'text-destructive')} />
            </div>
            <div>
              <CardTitle className="text-lg">{signal.allowed_pairs?.symbol}</CardTitle>
              <p className="text-sm text-muted-foreground">{signal.allowed_pairs?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(isBuy ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30')}>
              {isBuy ? t('signal.buy') : t('signal.sell')}
            </Badge>
            <Badge variant="outline">{signal.timeframe}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('signal.entry')}</span><span className="font-mono">${signal.entry_price.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('signal.stopLoss')}</span><span className="font-mono text-destructive">${signal.stop_loss.toLocaleString()}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">TP 1</span><span className="font-mono text-success">${signal.take_profit_1.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">TP 2</span><span className="font-mono text-success">${signal.take_profit_2.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">TP 3</span><span className="font-mono text-success">${signal.take_profit_3.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Outcome section */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            {getOutcomeBadge()}
            
            {/* Show PnL if available */}
            {signal.pnl_percent !== null && (
              <span className={cn(
                'text-sm font-semibold',
                signal.pnl_percent >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {formatPnL(signal.pnl_percent)}
              </span>
            )}
            
            <Badge className={gradeColors[signal.grade] || gradeColors['C']}>{t('signal.grade')} {signal.grade}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={getTradingViewUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {t('trackRecord.viewChart')}
            </a>
          </div>
        </div>

        {/* Timestamp info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {signal.closed_at ? (
              <span>{t('trackRecord.closedAt')}: {format(new Date(signal.closed_at), 'MMM d, HH:mm', { locale: dateLocales[language] })}</span>
            ) : (
              <span>{formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: dateLocales[language] })}</span>
            )}
          </div>
          
          {signal.analysis && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs h-6 px-2">
              {t('signal.analysis')}
              {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
        </div>
        
        {expanded && signal.analysis && <div className="pt-3 border-t border-border/50 animate-fade-in"><p className="text-sm text-muted-foreground">{signal.analysis}</p></div>}
      </CardContent>
    </Card>
  );
}
