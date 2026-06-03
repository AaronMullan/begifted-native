-- DEV-70: when a user picks "I chose this gift" in the gift action drawer,
-- mark the associated occasion as fulfilled. The sibling be-gifted repo's
-- daily gift-generation cron (app/api/cron/generate-gifts/route.ts) already
-- skips occasions where fulfilled_at IS NOT NULL, so this single write
-- suppresses further notifications for that occasion.
--
-- Only fires when occasion_id is present and the occasion hasn't already
-- been fulfilled. Other actions (DEV-48 PR-B handles rejections) are
-- intentionally ignored here.
CREATE OR REPLACE FUNCTION mark_occasion_fulfilled_on_chose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.action <> 'chose' OR NEW.occasion_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE occasions
  SET fulfilled_at = now()
  WHERE id = NEW.occasion_id
    AND fulfilled_at IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_occasion_fulfilled_on_chose_trigger
AFTER INSERT ON gift_feedback
FOR EACH ROW
EXECUTE FUNCTION mark_occasion_fulfilled_on_chose();
