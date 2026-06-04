-- DEV-48 PR-C: mark occasions as fulfilled when the user picks a gift, so the
-- be-gifted gift-generation cron can stop pinging them for that occasion until
-- the date rolls to next year.
--
-- The sibling be-gifted repo's cron (app/api/cron/generate-gifts/route.ts) is
-- the consumer: it must select fulfilled_at, skip generation+notification when
-- non-null, and clear it when an annual occasion's date is rolled to next
-- year's instance.
ALTER TABLE occasions
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION mark_occasion_fulfilled_on_chose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.action <> 'chose' THEN
    RETURN NEW;
  END IF;

  IF NEW.occasion_id IS NULL THEN
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
