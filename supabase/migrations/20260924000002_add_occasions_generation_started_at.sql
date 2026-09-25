-- Set by the be-gifted backend when a gift-generation run starts for this
-- occasion and cleared when it ends, so the app can tell "generating" apart
-- from "nothing is coming". Kept separate from last_generation_status because
-- the cron's skip gate reads that column. A value that outlives any real run
-- means the run was killed before it could clear it; the app treats a stale
-- value as a failed run.
ALTER TABLE occasions
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ;

COMMENT ON COLUMN occasions.generation_started_at IS
  'Start time of the in-flight gift-generation run for this occasion; NULL when none is running.';
