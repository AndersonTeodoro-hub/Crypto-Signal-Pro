// Plan-based pair restrictions
// Maps each plan to allowed trading pair symbols

export const PLAN_PAIRS = {
  free: ['BTCUSDT'],
  basic: [
    'BTCUSDT', 
    'ETHUSDT', 
    'XRPUSDT', 
    'ADAUSDT', 
    'DOGEUSDT',
    'MATICUSDT', 
    'TRXUSDT', 
    'AVAXUSDT', 
    'LINKUSDT', 
    'BNBUSDT'
  ],
  pro: null // null = all active pairs from database (up to 50)
} as const;

export type PlanType = 'free' | 'basic' | 'pro';

/**
 * Get allowed pair symbols for a given plan
 * Returns null for pro (meaning all pairs are allowed)
 */
export function getAllowedPairSymbols(plan: PlanType): string[] | null {
  return PLAN_PAIRS[plan];
}

/**
 * Check if a symbol is allowed for a given plan
 */
export function isSymbolAllowedForPlan(symbol: string, plan: PlanType): boolean {
  const allowed = PLAN_PAIRS[plan];
  if (allowed === null) return true; // Pro = all pairs
  return allowed.includes(symbol);
}

/**
 * Get max pairs count for a plan
 */
export function getMaxPairsForPlan(plan: PlanType): number {
  if (plan === 'free') return 1;
  if (plan === 'basic') return 10;
  return 50; // Pro
}
