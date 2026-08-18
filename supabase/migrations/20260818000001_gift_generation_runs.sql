-- Per-run telemetry for the gift-generation pipeline. One row per
-- generateGiftsForRecipient invocation (cron, on-demand, backfill, or repair
-- pass), written by the be-gifted backend via service role. Runs that yield
-- zero suggestions previously left no DB trace at all — this table is the
-- record that makes "the model only found 2" distinguishable from "we
-- generated 3 and filtered one out".
--
-- Deliberately no foreign keys: this is an append-only telemetry log, and
-- completion-rate metrics must survive recipient/occasion/user deletion.
CREATE TABLE IF NOT EXISTS gift_generation_runs (
  run_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('cron', 'on_demand', 'backfill', 'admin')),
  pass TEXT NOT NULL DEFAULT 'initial' CHECK (pass IN ('initial', 'repair')),
  -- run_id of the initial pass this repair run is completing, so a
  -- user-facing request can be read as one funnel across both passes
  parent_run_id UUID,
  user_id UUID,
  recipient_id UUID,
  occasion_id UUID,
  ai_provider TEXT,
  ai_model TEXT,
  protocol_prompt_id UUID,
  protocol_version INTEGER,
  wrapper_template_hash TEXT,
  target_count INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  -- Funnel totals across all attempts in the run, in pipeline order:
  -- raw model output -> field validation (blank reason / missing price)
  -- -> URL verification -> history/duplicate filter -> exactly-N gate
  -- -> rows actually persisted (post re-dedupe and capacity cap)
  model_returned_count INTEGER NOT NULL DEFAULT 0,
  valid_count INTEGER NOT NULL DEFAULT 0,
  url_verified_count INTEGER NOT NULL DEFAULT 0,
  unique_count INTEGER NOT NULL DEFAULT 0,
  final_count INTEGER NOT NULL DEFAULT 0,
  stored_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  tool_error_count INTEGER NOT NULL DEFAULT 0,
  timeout_hit BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('ok', 'no_results', 'error')),
  status_reason TEXT,
  -- [{ attempt, stage, reason, name, url? }] — one entry per removed candidate
  rejections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ attempt, model_returned, valid, url_verified, unique_new, search_count, latency_ms, error? }]
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS gift_generation_runs_created_at_idx ON gift_generation_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS gift_generation_runs_recipient_id_idx ON gift_generation_runs (recipient_id);
CREATE INDEX IF NOT EXISTS gift_generation_runs_status_idx ON gift_generation_runs (status);

ALTER TABLE gift_generation_runs ENABLE ROW LEVEL SECURITY;

-- Backend writes bypass RLS via service role; the only client access is the
-- RN admin tooling reading runs across users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gift_generation_runs'
      AND policyname = 'Admins can read all gift_generation_runs'
  ) THEN
    CREATE POLICY "Admins can read all gift_generation_runs"
      ON gift_generation_runs FOR SELECT
      TO authenticated
      USING ((SELECT is_admin()));
  END IF;
END $$;
