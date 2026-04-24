-- Expand signals.setup check constraint to include EMA_BOUNCE and VOLUME_DIVERGENCE
ALTER TABLE public.signals DROP CONSTRAINT IF EXISTS signals_setup_check;

ALTER TABLE public.signals
  ADD CONSTRAINT signals_setup_check
  CHECK (setup = ANY (ARRAY['SWEEP_OB'::text, 'FVG_TREND'::text, 'BOS_RETEST'::text, 'EMA_BOUNCE'::text, 'VOLUME_DIVERGENCE'::text]));
