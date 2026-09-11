-- Token usage per gift-generation run, summed across the run's provider
-- calls, so cost per run and the effect of a model change can be computed
-- from our own data instead of the provider's usage dashboard.
--
-- Semantics are normalized to OpenAI's: input_tokens is the whole prompt
-- (cached_input_tokens is the subset served from the prefix cache), and
-- output_tokens is the whole completion (reasoning_tokens is the subset the
-- model spent thinking). Anthropic reports cache reads/writes outside
-- input_tokens; the backend folds them back in before writing.
--
-- NULL means the provider reported no usage (or the run predates this
-- column); 0 is a real measurement.
ALTER TABLE gift_generation_runs
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cached_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER;
