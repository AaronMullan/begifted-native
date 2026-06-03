-- DEV-109: normalize every drawer action into a structured feedback event
-- carrying a `signal_type`, so downstream consumers (generation context,
-- signal-specific CIS) can distinguish e.g. "owned_item" from "negative_taste"
-- instead of collapsing every rejection into "add to avoid list".
--
-- This is additive: the existing avoid-list and fulfilled-at triggers stay
-- keyed off `action` and are unchanged. We add the new normalized columns,
-- a deterministic action -> signal_type derivation, and denormalized
-- gift_title/price so consumers don't need to join back to a (possibly
-- deleted) gift_suggestions row.

-- 1. New action value: free-text "Gift feedback" was previously overloaded onto
--    `keep_in_mix`. Give it its own action so it maps to its own signal_type.
ALTER TABLE gift_feedback DROP CONSTRAINT IF EXISTS gift_feedback_action_check;
ALTER TABLE gift_feedback
  ADD CONSTRAINT gift_feedback_action_check CHECK (action IN (
    'keep_in_mix',
    'chose',
    'already_have',
    'not_for_them',
    'price_off',
    'product_problem',
    'remove',
    'gift_feedback'
  ));

-- 2. Normalized + denormalized columns from the DEV-109 event shape.
--    category_tags has no source on gift_suggestions today; the column exists so
--    generation/CIS can read a stable shape and we can backfill it later.
ALTER TABLE gift_feedback
  ADD COLUMN IF NOT EXISTS signal_type TEXT,
  ADD COLUMN IF NOT EXISTS gift_title TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC,
  ADD COLUMN IF NOT EXISTS category_tags TEXT[];

ALTER TABLE gift_feedback DROP CONSTRAINT IF EXISTS gift_feedback_signal_type_check;
ALTER TABLE gift_feedback
  ADD CONSTRAINT gift_feedback_signal_type_check CHECK (signal_type IS NULL OR signal_type IN (
    'neutral_or_soft_positive',
    'strong_positive',
    'owned_item',
    'negative_taste',
    'budget_feedback',
    'product_quality_issue',
    'display_removal_or_weak_negative',
    'free_text_feedback'
  ));

-- 3. Single source of truth for the action -> signal_type mapping.
CREATE OR REPLACE FUNCTION gift_feedback_signal_for_action(p_action text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_action
    WHEN 'keep_in_mix'     THEN 'neutral_or_soft_positive'
    WHEN 'chose'           THEN 'strong_positive'
    WHEN 'already_have'    THEN 'owned_item'
    WHEN 'not_for_them'    THEN 'negative_taste'
    WHEN 'price_off'       THEN 'budget_feedback'
    WHEN 'product_problem' THEN 'product_quality_issue'
    WHEN 'remove'          THEN 'display_removal_or_weak_negative'
    WHEN 'gift_feedback'   THEN 'free_text_feedback'
  END;
$$;

-- 4. BEFORE INSERT trigger: always derive signal_type from action (guarantees
--    the invariant in AC #1), and denormalize gift_title/price from the
--    suggestion at write time when the caller didn't supply them.
CREATE OR REPLACE FUNCTION populate_gift_feedback_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.signal_type := gift_feedback_signal_for_action(NEW.action);

  IF NEW.gift_title IS NULL OR NEW.price IS NULL THEN
    SELECT
      COALESCE(NEW.gift_title, gs.title),
      COALESCE(NEW.price, gs.price)
    INTO NEW.gift_title, NEW.price
    FROM gift_suggestions gs
    WHERE gs.id = NEW.gift_suggestion_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER populate_gift_feedback_signal_trigger
BEFORE INSERT ON gift_feedback
FOR EACH ROW
EXECUTE FUNCTION populate_gift_feedback_signal();

-- 5. Backfill existing rows: derive signal_type and denormalize title/price.
UPDATE gift_feedback gf
SET signal_type = gift_feedback_signal_for_action(gf.action),
    gift_title = COALESCE(gf.gift_title, gs.title),
    price = COALESCE(gf.price, gs.price)
FROM gift_suggestions gs
WHERE gs.id = gf.gift_suggestion_id;

-- Rows whose suggestion was already deleted still get a signal_type.
UPDATE gift_feedback
SET signal_type = gift_feedback_signal_for_action(action)
WHERE signal_type IS NULL;
