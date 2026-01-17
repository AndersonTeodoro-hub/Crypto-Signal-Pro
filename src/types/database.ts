export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  plan: 'free' | 'basic' | 'pro';
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
  timeframe: '1H' | '4H';
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
  created_at: string;
  expires_at: string | null;
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
