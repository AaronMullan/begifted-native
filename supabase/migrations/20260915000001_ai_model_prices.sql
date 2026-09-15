-- Per-model token prices, so the admin console can turn the token counts on
-- gift_generation_runs into dollars from our own data. Prices live in a table
-- rather than in code because the PM reprices without a release, and the
-- backend can later read the same rows.
--
-- Dated history: a reprice is a new row with a later effective_from, and a
-- run is costed at the newest row whose effective_from is on or before the
-- run's UTC date, so past spend stays correct when a provider changes its
-- list price. Saving the same model and date again overwrites that row, so a
-- typo can be corrected the day it was made. Prices are USD per million
-- tokens. Cached input is the rate for the prompt-cache share of
-- input_tokens.
CREATE TABLE IF NOT EXISTS public.ai_model_prices (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_per_m NUMERIC(10, 4) NOT NULL CHECK (input_per_m >= 0),
  cached_input_per_m NUMERIC(10, 4) NOT NULL CHECK (cached_input_per_m >= 0),
  output_per_m NUMERIC(10, 4) NOT NULL CHECK (output_per_m >= 0),
  effective_from DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (provider, model, effective_from)
);

ALTER TABLE public.ai_model_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai_model_prices" ON public.ai_model_prices;
CREATE POLICY "Admins can read ai_model_prices"
  ON public.ai_model_prices FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can insert ai_model_prices" ON public.ai_model_prices;
CREATE POLICY "Admins can insert ai_model_prices"
  ON public.ai_model_prices FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can update ai_model_prices" ON public.ai_model_prices;
CREATE POLICY "Admins can update ai_model_prices"
  ON public.ai_model_prices FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Seed the two models the Sol-vs-Astra decision is about, dated to the day
-- token tracking began so every tracked run has a price.
INSERT INTO public.ai_model_prices
  (provider, model, input_per_m, cached_input_per_m, output_per_m, effective_from)
VALUES
  ('openai', 'gpt-5.6-sol', 4, 0.4, 20, '2026-09-10'),
  ('openai', 'gpt-6-astra', 10, 1, 50, '2026-09-10')
ON CONFLICT (provider, model, effective_from) DO NOTHING;
