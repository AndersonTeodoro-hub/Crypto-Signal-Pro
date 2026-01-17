import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignalWithPair } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SignalCardProps {
  signal: SignalWithPair;
}

export function SignalCard({ signal }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const isBuy = signal.direction === 'LONG';
  const directionColor = isBuy ? 'success' : 'destructive';
  const DirectionIcon = isBuy ? TrendingUp : TrendingDown;

  const gradeColors: Record<string, string> = {
    'A+': 'bg-success/20 text-success border-success/30',
    'A': 'bg-success/20 text-success border-success/30',
    'B+': 'bg-warning/20 text-warning border-warning/30',
    'B': 'bg-warning/20 text-warning border-warning/30',
    'C': 'bg-muted/50 text-muted-foreground border-muted/50',
  };

  return (
    <Card className={cn(
      'glass overflow-hidden transition-all duration-300',
      isBuy ? 'border-l-4 border-l-success' : 'border-l-4 border-l-destructive'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isBuy ? 'bg-success/20' : 'bg-destructive/20'
            )}>
              <DirectionIcon className={cn(
                'h-5 w-5',
                isBuy ? 'text-success' : 'text-destructive'
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{signal.allowed_pairs?.symbol}</CardTitle>
              <p className="text-sm text-muted-foreground">{signal.allowed_pairs?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={cn(
              isBuy ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'
            )}>
              {isBuy ? 'COMPRA' : 'VENDA'}
            </Badge>
            <Badge variant="outline">{signal.timeframe}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Levels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrada</span>
              <span className="font-mono">${signal.entry_price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stop Loss</span>
              <span className="font-mono text-destructive">${signal.stop_loss.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP 1</span>
              <span className="font-mono text-success">${signal.take_profit_1.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP 2</span>
              <span className="font-mono text-success">${signal.take_profit_2.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP 3</span>
              <span className="font-mono text-success">${signal.take_profit_3.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Badge className={gradeColors[signal.grade] || gradeColors['C']}>
              Grade {signal.grade}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: ptBR })}
            </div>
          </div>

          {signal.analysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs"
            >
              Análise
              {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* Expanded Analysis */}
        {expanded && signal.analysis && (
          <div className="pt-3 border-t border-border/50 animate-fade-in">
            <p className="text-sm text-muted-foreground">{signal.analysis}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
