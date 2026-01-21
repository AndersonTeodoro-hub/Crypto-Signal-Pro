import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useSignalAlerts } from '@/hooks/useSignalAlerts';
import { getAllowedPairSymbols } from '@/lib/planPairs';
import type { PlanType } from '@/lib/plans';

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

  // Get allowed symbols for the user's plan
  const allowedSymbols = getAllowedPairSymbols(effectivePlan as PlanType);

  // Initialize signal alerts subscription
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
