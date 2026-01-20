-- PHASE 1: Create database views for Active Pairs and Performance Stats

-- 1.1 Create VIEW latest_signals_by_pair
-- Returns the most recent signal for each pair/timeframe combination
CREATE OR REPLACE VIEW public.latest_signals_by_pair AS
WITH ranked AS (
  SELECT 
    s.id,
    s.pair_id,
    s.timeframe,
    s.direction,
    s.grade,
    s.setup,
    s.entry_price,
    s.stop_loss,
    s.take_profit_1,
    s.take_profit_2,
    s.take_profit_3,
    s.status,
    s.outcome_tp,
    s.pnl_percent,
    s.confidence,
    s.analysis,
    s.created_at,
    s.expires_at,
    s.closed_at,
    p.symbol,
    p.name as pair_name,
    p.rank as pair_rank,
    ROW_NUMBER() OVER (
      PARTITION BY s.pair_id, s.timeframe 
      ORDER BY s.created_at DESC
    ) as rn
  FROM signals s
  JOIN allowed_pairs p ON s.pair_id = p.id
  WHERE p.is_active = true
)
SELECT 
  id,
  pair_id,
  timeframe,
  direction,
  grade,
  setup,
  entry_price,
  stop_loss,
  take_profit_1,
  take_profit_2,
  take_profit_3,
  status,
  outcome_tp,
  pnl_percent,
  confidence,
  analysis,
  created_at,
  expires_at,
  closed_at,
  symbol,
  pair_name,
  pair_rank
FROM ranked WHERE rn = 1;

-- 1.2 Create VIEW performance_stats
-- Aggregated performance metrics for social proof (24h, 7d, 30d)
CREATE OR REPLACE VIEW public.performance_stats AS
SELECT 
  -- 24h stats
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'hit_tp' AND outcome_tp = 1) as tp1_hits_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'hit_tp' AND outcome_tp = 2) as tp2_hits_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'hit_tp' AND outcome_tp = 3) as tp3_hits_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'hit_sl') as stops_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'active') as open_24h,
  CASE 
    WHEN COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status IN ('hit_tp', 'hit_sl')) > 0 
    THEN ROUND(
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'hit_tp')::numeric / 
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND status IN ('hit_tp', 'hit_sl'))::numeric * 100, 
      1
    )
    ELSE 0
  END as win_rate_24h,
  
  -- 7d stats
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'hit_tp' AND outcome_tp = 1) as tp1_hits_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'hit_tp' AND outcome_tp = 2) as tp2_hits_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'hit_tp' AND outcome_tp = 3) as tp3_hits_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'hit_sl') as stops_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'active') as open_7d,
  CASE 
    WHEN COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status IN ('hit_tp', 'hit_sl')) > 0 
    THEN ROUND(
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'hit_tp')::numeric / 
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND status IN ('hit_tp', 'hit_sl'))::numeric * 100, 
      1
    )
    ELSE 0
  END as win_rate_7d,
  
  -- 30d stats
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'hit_tp' AND outcome_tp = 1) as tp1_hits_30d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'hit_tp' AND outcome_tp = 2) as tp2_hits_30d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'hit_tp' AND outcome_tp = 3) as tp3_hits_30d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'hit_sl') as stops_30d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'active') as open_30d,
  CASE 
    WHEN COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status IN ('hit_tp', 'hit_sl')) > 0 
    THEN ROUND(
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'hit_tp')::numeric / 
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status IN ('hit_tp', 'hit_sl'))::numeric * 100, 
      1
    )
    ELSE 0
  END as win_rate_30d,
  
  -- Last update timestamp
  MAX(COALESCE(closed_at, created_at)) as last_updated
FROM signals;