import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ExternalLink, CheckCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { enUS, ptBR, es } from 'date-fns/locale';
import type { SignalWithPair } from '@/types/database';

const dateLocales = { en: enUS, pt: ptBR, es: es };

export function LatestWinSignalCard() {
  const { t, language } = useLanguage();
  const [signal, setSignal] = useState<SignalWithPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestWin() {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*, allowed_pairs(*)')
          .eq('status', 'hit_tp')
          .order('closed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setSignal(data as SignalWithPair);
        }
      } catch (err) {
        console.error('Error fetching latest win:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestWin();
  }, []);

  // Fallback to static card if no wins yet
  if (loading || !signal) {
    return <StaticSignalCard />;
  }

  const isBuy = signal.direction === 'LONG';
  const DirectionIcon = isBuy ? TrendingUp : TrendingDown;
  const pairSymbol = signal.allowed_pairs?.symbol || 'BTC/USDT';
  const pairName = signal.allowed_pairs?.name || 'Bitcoin';
  
  const getTradingViewUrl = () => {
    const symbol = pairSymbol.replace('/', '');
    return `https://www.tradingview.com/chart/?symbol=BYBIT:${symbol}`;
  };

  const formatPnL = (pnl: number | null) => {
    if (pnl === null) return '+0.00%';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(2)}%`;
  };

  return (
    <div className="relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-success/40 to-accent/40 rounded-2xl blur-2xl transform scale-110" />
      
      {/* Latest Win Label */}
      <div className="absolute -top-3 left-4 z-10">
        <Badge className="bg-success text-success-foreground text-xs flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('trackRecord.latestWin')}
        </Badge>
      </div>
      
      {/* Signal Card */}
      <div className="glass rounded-2xl p-6 relative animate-float border border-success/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isBuy ? 'bg-success/20' : 'bg-destructive/20'}`}>
              <DirectionIcon className={`h-6 w-6 ${isBuy ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <h3 className="font-bold text-lg">{pairSymbol}</h3>
              <p className="text-sm text-muted-foreground">{pairName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">{formatPnL(signal.pnl_percent)}</p>
            <Badge className="bg-success/20 text-success border-success/30">
              TP{signal.outcome_tp}
            </Badge>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('signal.entry')}</span>
            <span className="font-mono">${signal.entry_price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('trackRecord.outcome')}</span>
            <span className="font-mono text-success">${signal.outcome_price?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('signal.stopLoss')}</span>
            <span className="font-mono text-destructive">${signal.stop_loss.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{signal.timeframe}</Badge>
            <span className="text-sm text-muted-foreground">
              {signal.closed_at && format(new Date(signal.closed_at), 'MMM d, HH:mm', { locale: dateLocales[language] })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={getTradingViewUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {t('trackRecord.verify')}
            </a>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{t('trackRecord.disclaimer')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// Static fallback card
function StaticSignalCard() {
  const { t } = useLanguage();
  
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur-2xl transform scale-110" />
      
      <div className="glass rounded-2xl p-6 relative animate-float border border-success/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <h3 className="font-bold text-lg">BTC/USDT</h3>
              <p className="text-sm text-muted-foreground">Bitcoin</p>
            </div>
          </div>
          <Badge className="bg-success/20 text-success border-success/30">
            {t('signal.buy')}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('signal.entry')}</span>
            <span className="font-mono">$67,450.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('signal.stopLoss')}</span>
            <span className="font-mono text-destructive">$66,200.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('signal.takeProfit')}</span>
            <span className="font-mono text-success">$70,000.00</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Badge variant="outline">1H</Badge>
          <span className="text-sm text-muted-foreground">{t('signal.grade')}: A+</span>
        </div>
      </div>
    </div>
  );
}
