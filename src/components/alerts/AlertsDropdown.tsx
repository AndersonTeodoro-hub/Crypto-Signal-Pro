import { useState } from 'react';
import { Bell, BellOff, Volume2, Monitor, Target, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlertSettings, type AlertSettings } from '@/hooks/useAlertSettings';
import { enableAudio, playTestBeep, isAudioEnabled } from '@/lib/sounds';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export function AlertsDropdown() {
  const { settings, updateSettings, isEnabled } = useAlertSettings();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleEnableAlerts = async () => {
    // Enable audio context (requires user gesture)
    const audioOk = await enableAudio();
    
    if (audioOk) {
      // Play test beep to confirm
      playTestBeep(settings.volume);
      
      // Enable alerts
      updateSettings({ enabled: true });
      
      toast({
        title: t('alerts.enabled'),
        description: t('alerts.audioUnlocked'),
      });
    } else {
      toast({
        title: t('common.error'),
        description: t('alerts.audioError'),
        variant: 'destructive',
      });
    }
  };

  const handleDisableAlerts = () => {
    updateSettings({ enabled: false });
  };

  const handleTestSound = () => {
    if (!isAudioEnabled()) {
      enableAudio().then(() => {
        playTestBeep(settings.volume);
      });
    } else {
      playTestBeep(settings.volume);
    }
  };

  const handleRequestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: t('common.error'),
        description: t('alerts.notificationsNotSupported'),
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateSettings({ desktopEnabled: true });
      toast({
        title: t('common.success'),
        description: t('alerts.notificationsEnabled'),
      });
    } else {
      toast({
        title: t('common.error'),
        description: t('alerts.permissionDenied'),
        variant: 'destructive',
      });
    }
  };

  const handleDesktopToggle = (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      handleRequestDesktopPermission();
    } else {
      updateSettings({ desktopEnabled: enabled });
    }
  };

  // Not enabled state - show enable button
  if (!isEnabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnableAlerts}
        className="gap-2"
      >
        <BellOff className="h-4 w-4" />
        <span className="hidden sm:inline">{t('alerts.enable')}</span>
      </Button>
    );
  }

  // Enabled state - show dropdown
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/50 text-primary"
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">{t('alerts.enabled')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{t('alerts.settings')}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisableAlerts}
              className="text-destructive hover:text-destructive"
            >
              {t('alerts.disable')}
            </Button>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sound-toggle">{t('alerts.sound')}</Label>
            </div>
            <Switch
              id="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>

          {/* Volume Slider */}
          {settings.soundEnabled && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">{t('alerts.volume')}</Label>
                <span className="text-sm text-muted-foreground">{Math.round(settings.volume * 100)}%</span>
              </div>
              <Slider
                value={[settings.volume]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]) => updateSettings({ volume: value })}
                className="w-full"
              />
            </div>
          )}

          {/* Desktop Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="desktop-toggle">{t('alerts.desktop')}</Label>
            </div>
            <Switch
              id="desktop-toggle"
              checked={settings.desktopEnabled}
              onCheckedChange={handleDesktopToggle}
            />
          </div>

          {/* Outcome Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="outcome-toggle">{t('alerts.outcomes')}</Label>
            </div>
            <Switch
              id="outcome-toggle"
              checked={settings.outcomeAlerts}
              onCheckedChange={(checked) => updateSettings({ outcomeAlerts: checked })}
            />
          </div>

          {/* Grade Filter */}
          <div className="space-y-2">
            <Label className="text-sm">{t('alerts.gradeFilter')}</Label>
            <Select
              value={settings.gradeFilter}
              onValueChange={(value: AlertSettings['gradeFilter']) => 
                updateSettings({ gradeFilter: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('alerts.gradeAll')}</SelectItem>
                <SelectItem value="A">{t('alerts.gradeAOnly')}</SelectItem>
                <SelectItem value="A+">{t('alerts.gradeAPlusOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Sound Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestSound}
            className="w-full gap-2"
          >
            <TestTube className="h-4 w-4" />
            {t('alerts.test')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
