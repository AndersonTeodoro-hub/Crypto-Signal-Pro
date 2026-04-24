-- Update candles.timeframe check constraint: remove 4H, allow 15m
ALTER TABLE public.candles DROP CONSTRAINT IF EXISTS candles_timeframe_check;

-- Purge legacy 4H candles (timeframe removed from the product)
DELETE FROM public.candles WHERE timeframe = '4H';

ALTER TABLE public.candles
  ADD CONSTRAINT candles_timeframe_check
  CHECK (timeframe = ANY (ARRAY['15m'::text, '1H'::text]));
