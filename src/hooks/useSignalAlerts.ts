import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAlertSettings } from './useAlertSettings';
import { playAlertBeep, isAudioEnabled } from '@/lib/sounds';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UseSignalAlertsOptions {
  allowedSymbols: string[] | null;
  enabled: boolean;
}

export function useSignalAlerts({ allowedSymbols, enabled }: UseSignalAlertsOptions) {
  const { settings, isSoundEnabled, isDesktopEnabled, isOutcomeAlertsEnabled } = useAlertSettings();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const notifiedIds = useRef<Set<string>>(new Set());
  const lastAlertAt = useRef<number>(0);
  const pairSymbolCache = useRef<Map<string, string>>(new Map());

  const isInCooldown = useCallback(() => {
    return Date.now() - lastAlertAt.current < settings.cooldownSec * 1000;
  }, [settings.cooldownSec]);

  const passesGradeFilter = useCallback((grade: string) => {
    if (settings.gradeFilter === 'all') return true;
    if (settings.gradeFilter === 'A') return grade === 'A' || grade === 'A+';
    return grade === 'A+';
  }, [settings.gradeFilter]);

  const getPairSymbol = useCallback(async (pairId: string): Promise<string | null> => {
    if (pairSymbolCache.current.has(pairId)) {
      return pairSymbolCache.current.get(pairId)!;
    }
    const { data } = await supabase.from('allowed_pairs').select('symbol').eq('id', pairId).single();
    if (data) pairSymbolCache.current.set(pairId, data.symbol);
    return data?.symbol || null;
  }, []);

  const isPairAllowed = useCallback(async (pairId: string): Promise<boolean> => {
    if (allowedSymbols === null) return true;
    const symbol = await getPairSymbol(pairId);
    return symbol ? allowedSymbols.includes(symbol) : false;
  }, [allowedSymbols, getPairSymbol]);

  const triggerAlert = useCallback((title: string, body: string, type: 'signal' | 'outcome' = 'signal') => {
    lastAlertAt.current = Date.now();
    toast({ title, description: body });
    if (isSoundEnabled && isAudioEnabled()) playAlertBeep(settings.volume, type);
    if (isDesktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/icons/icon-192.png' }); } catch {}
    }
  }, [toast, isSoundEnabled, isDesktopEnabled, settings.volume]);

  useEffect(() => {
    if (!enabled || !settings.enabled) return;

    const channel = supabase.channel('signals-alerts').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'signals' },
      async (payload) => {
        const signal = payload.new as { id: string; pair_id: string; timeframe: string; direction: string; grade: string; status: string };
        const oldSignal = payload.old as { status?: string } | undefined;
        
        if (!signal?.id) return;
        
        // Handle INSERT (new signal)
        if (payload.eventType === 'INSERT' && signal.status === 'active') {
          if (notifiedIds.current.has(signal.id) || isInCooldown() || !passesGradeFilter(signal.grade)) return;
          if (!(await isPairAllowed(signal.pair_id))) return;
          const symbol = await getPairSymbol(signal.pair_id);
          if (!symbol) return;
          
          notifiedIds.current.add(signal.id);
          if (notifiedIds.current.size > 200) notifiedIds.current = new Set(Array.from(notifiedIds.current).slice(-100));
          
          triggerAlert(`🚀 ${t('alerts.newSignal')}: ${symbol}`, `${signal.direction === 'LONG' ? 'BUY' : 'SELL'} (${signal.timeframe}) • Grade ${signal.grade}`);
        }
        
        // Handle UPDATE (outcome change)
        if (payload.eventType === 'UPDATE' && isOutcomeAlertsEnabled && oldSignal?.status === 'active' && signal.status !== 'active') {
          const outcomeKey = `${signal.id}-${signal.status}`;
          if (notifiedIds.current.has(outcomeKey) || isInCooldown()) return;
          if (!(await isPairAllowed(signal.pair_id))) return;
          const symbol = await getPairSymbol(signal.pair_id);
          if (!symbol) return;
          
          notifiedIds.current.add(outcomeKey);
          const emoji = signal.status === 'hit_tp' ? '🎯' : signal.status === 'hit_sl' ? '🛑' : '⏰';
          const title = signal.status === 'hit_tp' ? t('alerts.outcomeTP') : signal.status === 'hit_sl' ? t('alerts.outcomeSL') : t('alerts.outcomeExpired');
          triggerAlert(`${emoji} ${title}: ${symbol}`, `${signal.direction === 'LONG' ? 'BUY' : 'SELL'} (${signal.timeframe})`, 'outcome');
        }
      }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [enabled, settings.enabled, isInCooldown, passesGradeFilter, isPairAllowed, getPairSymbol, triggerAlert, isOutcomeAlertsEnabled, t]);

  return { isActive: enabled && settings.enabled };
}
