import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, type PlanType } from '@/lib/plans';

interface UserPlanData {
  plan: PlanType;
  loading: boolean;
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  limits: {
    pairs: number;
    timeframes: readonly string[];
    historyDays: number | null;
  };
  canAccessTimeframe: (timeframe: string) => boolean;
  getMaxPairs: () => number;
  getHistoryDays: () => number | null;
}

export function useUserPlan(): UserPlanData {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data?.plan && ['free', 'basic', 'pro'].includes(data.plan)) {
          setPlan(data.plan as PlanType);
        }
      } catch (error) {
        console.error('Error loading user plan:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [user]);

  const planData = PLANS[plan];

  const canAccessTimeframe = (timeframe: string): boolean => {
    return (planData.timeframes as readonly string[]).includes(timeframe);
  };

  const getMaxPairs = (): number => {
    return planData.pairs;
  };

  const getHistoryDays = (): number | null => {
    return planData.historyDays;
  };

  return {
    plan,
    loading,
    isPro: plan === 'pro',
    isBasic: plan === 'basic',
    isFree: plan === 'free',
    limits: {
      pairs: planData.pairs,
      timeframes: planData.timeframes,
      historyDays: planData.historyDays,
    },
    canAccessTimeframe,
    getMaxPairs,
    getHistoryDays,
  };
}
