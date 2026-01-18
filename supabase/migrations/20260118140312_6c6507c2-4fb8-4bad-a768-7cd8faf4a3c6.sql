-- Add outcome tracking columns to signals table
ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_price numeric,
  ADD COLUMN IF NOT EXISTS pnl_percent numeric,
  ADD COLUMN IF NOT EXISTS outcome_tp integer;

-- Performance indexes for outcome queries
CREATE INDEX IF NOT EXISTS idx_signals_status_created ON public.signals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_closed_at ON public.signals(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status_closed ON public.signals(status, closed_at DESC);