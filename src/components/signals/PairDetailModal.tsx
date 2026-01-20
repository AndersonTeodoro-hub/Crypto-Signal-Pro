import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, History, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice, getTimeAgo } from '@/lib/signalCalculations';
import { format } from 'date-fns';

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
  pnl_percent: number | null;
  grade: string;
  created_at: string;
}

interface PairDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairId: string;
  symbol: string;
  pairName: string;
}

export function PairDetailModal({ isOpen, onClose, pairId, symbol, pairName }: PairDetailModalProps) {
  const { t, language } = useLanguage();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && pairId) {
      fetchSignals();
    }
  }, [isOpen, pairId]);

  const fetchSignals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('pair_id', pairId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setSignals(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (signal: Signal) => {
    if (signal.status === 'active') {
      return <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">{t('activePairs.open')}</Badge>;
    }
    if (signal.status === 'hit_tp') {
      const tpLabel = signal.outcome_tp ? `TP${signal.outcome_tp}` : 'TP';
      return <Badge variant="outline" className="bg-success/20 text-success border-success/30">{tpLabel} HIT</Badge>;
    }
    if (signal.status === 'hit_sl') {
      return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">STOP</Badge>;
    }
    return <Badge variant="outline">{signal.status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-bold text-xl">{symbol}</span>
            <span className="text-muted-foreground text-base font-normal">{pairName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('activePairs.lastSignals')}
          </h3>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('dashboard.noSignals')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TF</TableHead>
                  <TableHead>{t('history.direction')}</TableHead>
                  <TableHead>{t('activePairs.entry')}</TableHead>
                  <TableHead>{t('trackRecord.outcome')}</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>{t('signal.grade')}</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={signal.id}>
                    <TableCell>
                      <Badge variant="outline">{signal.timeframe}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={signal.direction === 'LONG' 
                          ? 'bg-success/20 text-success border-success/30' 
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                        }
                      >
                        {signal.direction === 'LONG' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {signal.direction === 'LONG' ? t('signal.buy') : t('signal.sell')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPrice(signal.entry_price)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(signal)}
                    </TableCell>
                    <TableCell>
                      {signal.pnl_percent !== null ? (
                        <span className={signal.pnl_percent >= 0 ? 'text-success' : 'text-destructive'}>
                          {signal.pnl_percent >= 0 ? '+' : ''}{signal.pnl_percent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{signal.grade}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(signal.created_at), 'dd/MM HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Link to={`/history?pair=${pairId}`}>
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                {t('activePairs.viewHistory')}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
