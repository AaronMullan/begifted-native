-- Gift feedback log: append-only record of user actions on individual gift
-- suggestions (DEV-48). Downstream consumers (generate-gift-suggestions,
-- notification scheduler) read the latest row per gift to drive recommendation
-- exclusions and ping suppression.
CREATE TABLE gift_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  gift_suggestion_id UUID NOT NULL REFERENCES gift_suggestions(id) ON DELETE CASCADE,
  occasion_id UUID REFERENCES occasions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'keep_in_mix',
    'chose',
    'already_have',
    'not_for_them',
    'price_off',
    'product_problem',
    'remove'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX gift_feedback_recipient_id_idx ON gift_feedback(recipient_id);
CREATE INDEX gift_feedback_gift_suggestion_id_idx ON gift_feedback(gift_suggestion_id);
CREATE INDEX gift_feedback_user_id_idx ON gift_feedback(user_id);
CREATE INDEX gift_feedback_occasion_id_idx ON gift_feedback(occasion_id);

ALTER TABLE gift_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gift feedback"
  ON gift_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gift feedback"
  ON gift_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gift feedback"
  ON gift_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gift feedback"
  ON gift_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
