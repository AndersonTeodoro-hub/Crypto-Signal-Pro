-- Fix security warnings: Set views to use SECURITY INVOKER
-- This ensures RLS policies are respected for the querying user

ALTER VIEW public.latest_signals_by_pair SET (security_invoker = on);
ALTER VIEW public.performance_stats SET (security_invoker = on);