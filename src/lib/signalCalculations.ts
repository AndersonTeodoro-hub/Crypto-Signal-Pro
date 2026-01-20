// Signal percentage calculations for trading signals
// Handles LONG and SHORT directions with proper sign conventions

export interface SignalPercentages {
  slPercent: number;
  slPercent2x: number;
  tp1Percent: number;
  tp1Percent2x: number;
  tp2Percent: number;
  tp2Percent2x: number;
  tp3Percent: number;
  tp3Percent2x: number;
}

/**
 * Calculate percentage moves for stop loss and take profits
 * LONG: SL is negative (loss), TP is positive (gain)
 * SHORT: SL is negative (loss), TP is positive (gain)
 */
export function calculatePercentages(
  direction: 'LONG' | 'SHORT',
  entry: number,
  stopLoss: number,
  tp1: number,
  tp2: number,
  tp3: number
): SignalPercentages {
  if (direction === 'LONG') {
    // LONG: price goes up to TP, down to SL
    const slPercent = -Math.abs(((entry - stopLoss) / entry) * 100);
    const tp1Percent = Math.abs(((tp1 - entry) / entry) * 100);
    const tp2Percent = Math.abs(((tp2 - entry) / entry) * 100);
    const tp3Percent = Math.abs(((tp3 - entry) / entry) * 100);
    
    return {
      slPercent,
      slPercent2x: slPercent * 2,
      tp1Percent,
      tp1Percent2x: tp1Percent * 2,
      tp2Percent,
      tp2Percent2x: tp2Percent * 2,
      tp3Percent,
      tp3Percent2x: tp3Percent * 2,
    };
  } else {
    // SHORT: price goes down to TP, up to SL
    const slPercent = -Math.abs(((stopLoss - entry) / entry) * 100);
    const tp1Percent = Math.abs(((entry - tp1) / entry) * 100);
    const tp2Percent = Math.abs(((entry - tp2) / entry) * 100);
    const tp3Percent = Math.abs(((entry - tp3) / entry) * 100);
    
    return {
      slPercent,
      slPercent2x: slPercent * 2,
      tp1Percent,
      tp1Percent2x: tp1Percent * 2,
      tp2Percent,
      tp2Percent2x: tp2Percent * 2,
      tp3Percent,
      tp3Percent2x: tp3Percent * 2,
    };
  }
}

/**
 * Format a percentage with sign and decimals
 * Example: +2.5%, -1.2%
 */
export function formatPercent(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Get human-readable time ago string
 */
export function getTimeAgo(date: string | Date, locale: string = 'en'): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (locale === 'pt') {
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  }
  
  if (locale === 'es') {
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
  }
  
  // English default
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
}
