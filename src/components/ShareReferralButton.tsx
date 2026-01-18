import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Check, Gift, Users } from 'lucide-react';
import { getBaseUrl } from '@/lib/urls';

interface ShareReferralButtonProps {
  referralCode: string;
  referralsCount?: number;
}

export function ShareReferralButton({ referralCode, referralsCount = 0 }: ShareReferralButtonProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const referralLink = `${getBaseUrl()}/?ref=${referralCode}`;
  const shareText = t('share.shareText');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: t('share.copied'),
        description: referralLink,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SMC Signals',
          text: `${shareText}\n`,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          handleCopy(); // Fallback to copy
        }
      }
    } else {
      handleCopy(); // Fallback for desktop
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t('share.title')}
        </CardTitle>
        <CardDescription>{t('share.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Code Display */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">{t('share.yourCode')}</p>
          <p className="text-2xl font-mono font-bold text-primary">{referralCode}</p>
        </div>

        {/* Link Display */}
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">{t('share.yourLink')}</p>
          <p className="text-sm font-mono break-all text-foreground/80">{referralLink}</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                {t('share.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('share.copyLink')}
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            className="gap-2 gradient-primary text-white"
          >
            <Share2 className="h-4 w-4" />
            {t('share.share')}
          </Button>
        </div>

        {/* Stats */}
        {referralsCount > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{referralsCount} {t('share.friendsJoined')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
