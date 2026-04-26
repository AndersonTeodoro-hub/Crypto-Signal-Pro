import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useSignalAlerts } from '@/hooks/useSignalAlerts';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, type PlanType } from '@/lib/plans';

interface AlertsContextValue {
  isActive: boolean;
}

const AlertsContext = createContext<AlertsContextValue>({ isActive: false });

export function useAlertsContext() {
  return useContext(AlertsContext);
}

interface AlertsProviderProps {
  children: ReactNode;
}

export function AlertsProvider({ children }: AlertsProviderProps) {
  const { user } = useAuth();
  const { effectivePlan, loading } = useUserPlan();
  const [allowedSymbols, setAllowedSymbols] = useState<string[] | null>(null);

  // Fetch top-N active pairs for the user's plan (Pro = null = unlimited)
  useEffect(() => {
    if (loading) return;
    if (effectivePlan === 'pro') {
      setAllowedSymbols(null);
      return;
    }
    const max = PLANS[effectivePlan as PlanType].pairs;
    supabase
      .from('allowed_pairs')
      .select('symbol')
      .eq('is_active', true)
      .order('rank')
      .limit(max)
      .then(({ data }) => {
        setAllowedSymbols(data?.map(p => p.symbol) ?? []);
      });
  }, [effectivePlan, loading]);

  const { isActive } = useSignalAlerts({
    allowedSymbols,
    enabled: !!user && !loading,
  });

  return (
    <AlertsContext.Provider value={{ isActive }}>
      {children}
    </AlertsContext.Provider>
  );
}
