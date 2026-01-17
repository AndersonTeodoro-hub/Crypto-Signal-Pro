export const PLANS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    pairs: 1,
    timeframes: ['4H'],
    historyDays: 7,
    features: [
      '1 pair monitored',
      '4H timeframe only',
      '7-day history',
      'Basic email alerts',
    ],
  },
  basic: {
    name: 'Basic',
    monthlyPrice: 39,
    annualPrice: 29,
    pairs: 10,
    timeframes: ['1H', '4H'],
    historyDays: 30,
    features: [
      '10 pairs monitored',
      '1H + 4H timeframes',
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
    timeframes: ['1H', '4H'],
    historyDays: null, // unlimited
    features: [
      '50 pairs monitored',
      '1H + 4H timeframes',
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
