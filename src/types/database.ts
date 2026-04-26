export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  plan: 'free' | 'basic' | 'pro';
  referral_code: string;
  referred_by: string | null;
  is_admin: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface AllowedPair {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  is_active: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  selected_pair_id: string | null;
  timeframe: 'all' | '15m' | '1H';
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Signal {
  id: string;
  pair_id: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  grade: 'A+' | 'A' | 'B+' | 'B';
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  analysis: string | null;
  status: 'active' | 'expired' | 'hit_tp' | 'hit_sl';
  setup: 'SWEEP_OB' | 'FVG_TREND' | 'BOS_RETEST' | 'EMA_BOUNCE' | 'VOLUME_DIVERGENCE' | null;
  confidence: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
  // Outcome tracking fields
  closed_at: string | null;
  outcome_price: number | null;
  pnl_percent: number | null;
  outcome_tp: 1 | 2 | 3 | null;
}

export interface Candle {
  id: string;
  pair_id: string;
  timeframe: '15m' | '1H';
  open_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export interface SignalWithPair extends Signal {
  allowed_pairs: AllowedPair;
}

export interface UserSignal {
  id: string;
  user_id: string;
  signal_id: string;
  is_read: boolean;
  is_notified: boolean;
  created_at: string;
}

export interface AccessGrant {
  id: string;
  user_id: string;
  plan: 'free' | 'basic' | 'pro';
  source: string;
  starts_at: string;
  expires_at: string;
  notes: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referee_user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'rewarded';
  created_at: string;
  approved_at: string | null;
  notes: string | null;
}

export interface ReferralWithProfiles extends Referral {
  referrer_profile?: { email: string | null };
  referee_profile?: { email: string | null };
}
