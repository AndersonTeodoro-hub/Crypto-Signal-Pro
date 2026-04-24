// TODO: revert free plan after 30-day trial (granted 2026-04-24, expires 2026-05-24)
export const PLANS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    pairs: 15,
    timeframes: ['15m', '1H'],
    historyDays: 30,
    features: [
      '15 pairs monitored (trial)',
      '15m + 1H timeframes (trial)',
      '30-day history',
      'Realtime alerts',
    ],
  },
  basic: {
    name: 'Basic',
    monthlyPrice: 39,
    annualPrice: 29,
    pairs: 10,
    timeframes: ['15m', '1H'],
    historyDays: 30,
    features: [
      '10 pairs monitored',
      '15m + 1H timeframes',
      '30-day history',
      'Realtime alerts',
      'Priority support',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 79,
    pairs: 50,
    timeframes: ['15m', '1H'],
    historyDays: null, // unlimited
    features: [
      '50 pairs monitored',
      '15m + 1H timeframes',
      'Unlimited history',
      'Priority support',
      'AI-confirmed SMC signals',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanPrice(plan: PlanType, period: 'monthly' | 'annual'): number {
  return period === 'monthly' ? PLANS[plan].monthlyPrice : PLANS[plan].annualPrice;
}

export function formatPrice(price: number, period: 'monthly' | 'annual'): string {
  if (price === 0) return '$0/mo';
  return period === 'monthly' ? `$${price}/mo` : `$${price}/mo billed annually`;
}
