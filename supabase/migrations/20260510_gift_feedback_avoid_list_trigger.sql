-- DEV-48 PR-B: feed gift_feedback rejection actions into recipients.avoid_list
-- so the existing CIS builder (sibling be-gifted repo, lib/utils/cis-builder.ts)
-- automatically surfaces them as history.avoid in the gift-generation prompt.
--
-- "chose" is intentionally excluded — it's a positive signal handled by PR-C
-- (notification suppression), not avoidance. "keep_in_mix" is a no-op.
CREATE OR REPLACE FUNCTION append_rejected_gift_to_avoid_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.action NOT IN ('not_for_them', 'already_have', 'product_problem', 'remove', 'price_off') THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_title
  FROM gift_suggestions
  WHERE id = NEW.gift_suggestion_id;

  IF v_title IS NULL OR v_title = '' THEN
    RETURN NEW;
  END IF;

  UPDATE recipients
  SET avoid_list = array_append(
        COALESCE(avoid_list, ARRAY[]::text[]),
        v_title
      ),
      updated_at = now()
  WHERE id = NEW.recipient_id
    AND NOT (v_title = ANY(COALESCE(avoid_list, ARRAY[]::text[])));

  RETURN NEW;
END;
$$;

CREATE TRIGGER append_rejected_gift_to_avoid_list_trigger
AFTER INSERT ON gift_feedback
FOR EACH ROW
EXECUTE FUNCTION append_rejected_gift_to_avoid_list();
