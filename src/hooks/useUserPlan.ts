import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, type PlanType } from '@/lib/plans';

interface AccessGrant {
  id: string;
  plan: string;
  expires_at: string;
  source: string;
}

interface UserPlanData {
  plan: PlanType;
  effectivePlan: PlanType;
  planSource: 'stripe' | 'grant' | 'default';
  grantExpiresAt: Date | null;
  loading: boolean;
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  isAdmin: boolean;
  referralCode: string | null;
  limits: {
    pairs: number;
    timeframes: readonly string[];
    historyDays: number | null;
  };
  canAccessTimeframe: (timeframe: string) => boolean;
  getMaxPairs: () => number;
  getHistoryDays: () => number | null;
  refetch: () => Promise<void>;
}

const PLAN_PRIORITY: Record<string, number> = {
  pro: 3,
  basic: 2,
  free: 1
};

export function useUserPlan(): UserPlanData {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [effectivePlan, setEffectivePlan] = useState<PlanType>('free');
  const [planSource, setPlanSource] = useState<'stripe' | 'grant' | 'default'>('default');
  const [grantExpiresAt, setGrantExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const loadPlan = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile with is_admin and referral_code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, is_admin, referral_code')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const basePlan = (profile?.plan as PlanType) || 'free';
      setPlan(basePlan);
      setIsAdmin(profile?.is_admin || false);
      setReferralCode(profile?.referral_code || null);

      // Check if user has Stripe subscription (plan !== 'free')
      if (basePlan !== 'free') {
        setEffectivePlan(basePlan);
        setPlanSource('stripe');
        setGrantExpiresAt(null);
        setLoading(false);
        return;
      }

      // Fetch active access grants
      const now = new Date().toISOString();
      const { data: grants, error: grantsError } = await supabase
        .from('access_grants')
        .select('id, plan, expires_at, source')
        .eq('user_id', user.id)
        .lte('starts_at', now)
        .gte('expires_at', now)
        .order('expires_at', { ascending: false });

      if (grantsError) {
        console.error('Error fetching grants:', grantsError);
        setEffectivePlan(basePlan);
        setPlanSource('default');
        setLoading(false);
        return;
      }

      if (grants && grants.length > 0) {
        // Find highest priority grant
        let bestGrant: AccessGrant | null = null;
        let bestPriority = 0;

        for (const grant of grants) {
          const priority = PLAN_PRIORITY[grant.plan] || 0;
          if (priority > bestPriority) {
            bestPriority = priority;
            bestGrant = grant;
          }
        }

        if (bestGrant && bestPriority > PLAN_PRIORITY[basePlan]) {
          setEffectivePlan(bestGrant.plan as PlanType);
          setPlanSource('grant');
          
          // Find the latest expiry among grants with the winning plan
          const winningPlanGrants = grants.filter(g => g.plan === bestGrant!.plan);
          const latestExpiry = winningPlanGrants.reduce((latest, g) => {
            const expiry = new Date(g.expires_at);
            return expiry > latest ? expiry : latest;
          }, new Date(0));
          
          setGrantExpiresAt(latestExpiry);
          setLoading(false);
          return;
        }
      }

      // Fallback to base plan
      setEffectivePlan(basePlan);
      setPlanSource('default');
      setGrantExpiresAt(null);
    } catch (error) {
      console.error('Error loading user plan:', error);
      setEffectivePlan('free');
      setPlanSource('default');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [user]);

  const planData = PLANS[effectivePlan];

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
    effectivePlan,
    planSource,
    grantExpiresAt,
    loading,
    isPro: effectivePlan === 'pro',
    isBasic: effectivePlan === 'basic',
    isFree: effectivePlan === 'free',
    isAdmin,
    referralCode,
    limits: {
      pairs: planData.pairs,
      timeframes: planData.timeframes,
      historyDays: planData.historyDays,
    },
    canAccessTimeframe,
    getMaxPairs,
    getHistoryDays,
    refetch: loadPlan
  };
}
