-- A recipient profile edit asks for a fresh set of gift ideas. The replaced
-- ideas can't be deleted -- gift_feedback cascades from gift_suggestions, so a
-- delete would destroy the feedback signal the generation prompt reads back --
-- so they are retired in place instead: hidden from the app and from the
-- list's capacity accounting, while still counting toward the avoid list so a
-- later run can't re-suggest them.
ALTER TABLE public.gift_suggestions
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- Every visible-list read filters on this column, always scoped to one
-- recipient.
CREATE INDEX IF NOT EXISTS gift_suggestions_recipient_active_idx
  ON public.gift_suggestions (recipient_id)
  WHERE superseded_at IS NULL;
