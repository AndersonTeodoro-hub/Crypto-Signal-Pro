import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculationModal({ isOpen, onClose }: CalculationModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('performance.howTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* OPEN */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 mb-1">OPEN</Badge>
              <p className="text-sm text-muted-foreground">{t('performance.howOpen')}</p>
            </div>
          </div>

          {/* TP1 HIT */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div>
              <Badge variant="outline" className="bg-success/20 text-success border-success/30 mb-1">TP1 HIT</Badge>
              <p className="text-sm text-muted-foreground">{t('performance.howTp1')}</p>
            </div>
          </div>

          {/* TP2 HIT */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div>
              <Badge variant="outline" className="bg-success/20 text-success border-success/30 mb-1">TP2 HIT</Badge>
              <p className="text-sm text-muted-foreground">{t('performance.howTp2')}</p>
            </div>
          </div>

          {/* TP3 HIT */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div>
              <Badge variant="outline" className="bg-success/20 text-success border-success/30 mb-1">TP3 HIT</Badge>
              <p className="text-sm text-muted-foreground">{t('performance.howTp3')}</p>
            </div>
          </div>

          {/* STOP HIT */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 mb-1">STOP HIT</Badge>
              <p className="text-sm text-muted-foreground">{t('performance.howStop')}</p>
            </div>
          </div>

          {/* Leverage Disclaimer */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{t('performance.leverageDisclaimer')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
