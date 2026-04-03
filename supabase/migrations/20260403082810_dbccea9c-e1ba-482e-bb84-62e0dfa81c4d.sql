
ALTER TABLE public.decision_tables
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'decision_table',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;
