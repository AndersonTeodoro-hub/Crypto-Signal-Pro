-- Criar tabela public.candles para cache de OHLCV
CREATE TABLE public.candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.allowed_pairs(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1H', '4H')),
  open_time TIMESTAMPTZ NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pair_id, timeframe, open_time)
);

-- Index para queries rápidas
CREATE INDEX idx_candles_pair_timeframe_time 
ON public.candles(pair_id, timeframe, open_time DESC);

-- RLS: permitir leitura pública, escrita apenas via service role
ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view candles" 
ON public.candles 
FOR SELECT 
USING (true);

-- Adicionar novas colunas na tabela signals
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS setup TEXT CHECK (setup IN ('SWEEP_OB', 'FVG_TREND', 'BOS_RETEST')),
ADD COLUMN IF NOT EXISTS confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_signals_pair_timeframe_created 
ON public.signals(pair_id, timeframe, created_at DESC);

-- Unique parcial: apenas 1 sinal ativo por par/timeframe
CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_active_unique 
ON public.signals(pair_id, timeframe) 
WHERE status = 'active';