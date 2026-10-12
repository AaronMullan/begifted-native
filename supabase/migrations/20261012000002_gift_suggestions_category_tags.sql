-- Give gift_feedback.category_tags a source: gift generation stores each
-- suggestion's style tags on gift_suggestions, and the feedback trigger copies
-- them at write time so the tags survive the suggestion being deleted.
--
-- No backfill: suggestions generated before this column existed have no tags
-- to copy.

ALTER TABLE gift_suggestions
  ADD COLUMN IF NOT EXISTS category_tags TEXT[];

CREATE OR REPLACE FUNCTION populate_gift_feedback_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  gs RECORD;
BEGIN
  NEW.signal_type := gift_feedback_signal_for_action(NEW.action);

  IF NEW.gift_title IS NULL OR NEW.price IS NULL OR NEW.category_tags IS NULL THEN
    -- Read into a record rather than SELECT ... INTO NEW.*: a missing
    -- suggestion would otherwise null out values the caller supplied.
    SELECT title, price, category_tags INTO gs
    FROM gift_suggestions
    WHERE id = NEW.gift_suggestion_id;

    IF FOUND THEN
      NEW.gift_title := COALESCE(NEW.gift_title, gs.title);
      NEW.price := COALESCE(NEW.price, gs.price);
      NEW.category_tags := COALESCE(NEW.category_tags, gs.category_tags);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
