-- Beta UX check-in responses (DEV-191). Structured multiple-choice answers from
-- the in-app "quick beta check-in" cards that fire once at three moments in the
-- core flow (after onboarding, first recipient added, first gift set reviewed).
-- The value is in aggregation (GROUP BY answer across testers), which is why
-- this lives in a table rather than Sentry -- Sentry stays for free-form
-- feedback and its triage inbox. Append-only: no UPDATE/DELETE policies.
CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Which check-in this row answers. Each maps to a distinct moment; a tester
  -- sees each at most once.
  screen TEXT NOT NULL CHECK (screen IN ('onboarding', 'first_recipient', 'first_gift_set')),
  -- Structured radio answers keyed by question id, e.g.
  -- {"felt_easy": "natural_and_easy", "used_voice": "no"}. JSONB so each
  -- screen's question set can differ without a schema change.
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Optional free-text (screens 2 and 3 only). NULL when the tester left it blank.
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beta_feedback_user_id_idx ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS beta_feedback_screen_idx ON beta_feedback(screen);
CREATE INDEX IF NOT EXISTS beta_feedback_created_at_idx ON beta_feedback(created_at);

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Append-only: authenticated users insert/read their own rows; admins read all
-- for aggregation. No UPDATE/DELETE policies.
CREATE POLICY "Users can insert own beta feedback"
  ON beta_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own beta feedback"
  ON beta_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all beta feedback"
  ON beta_feedback FOR SELECT
  TO authenticated
  USING (public.is_admin());
