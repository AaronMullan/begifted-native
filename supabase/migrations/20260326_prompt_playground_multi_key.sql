-- Add prompt_key to test runs so each run is associated with a specific prompt type
ALTER TABLE prompt_test_runs
  ADD COLUMN prompt_key TEXT;

-- Backfill existing rows (all current test runs are for gift generation)
UPDATE prompt_test_runs
  SET prompt_key = 'gift_generation_system'
  WHERE prompt_key IS NULL;

-- Make recipient_id nullable (non-gift prompts may not need a recipient)
ALTER TABLE prompt_test_runs
  ALTER COLUMN recipient_id DROP NOT NULL;

-- Add index for filtering test runs by prompt_key
CREATE INDEX idx_prompt_test_runs_key ON prompt_test_runs (prompt_key);
