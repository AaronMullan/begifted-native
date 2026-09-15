-- Activation milestones for lifecycle email. Each is stamped on profiles and
-- appended to product_events the first time its threshold holds, so both the
-- Customer.io attribute and the journey-triggering event come from the
-- existing customerio-sync triggers.
--
--   early_activated              1+ people and 1+ occasions
--   qualified_trial_user_reached 3+ people, 3+ occasions, 1+ recommendation
--                                click
--
-- The qualified definition also requires having viewed recommendations. A
-- click can only happen on a recommendation being viewed, so the click
-- satisfies both and view events aren't consulted. Reminder engagement is
-- not recorded anywhere yet, so only recommendation clicks count as
-- engagement. Trials don't exist yet, so qualification applies to every user.

-- Accounts that crossed a threshold before the triggers existed get the
-- timestamp only, never the event: a backfilled event would start
-- event-triggered journeys for activity that happened long ago. This runs
-- before the triggers are created so that, even if statements commit
-- separately, no already-qualified account can reach a trigger unstamped.
-- The stamp is the historical moment the threshold was reached. occasions has
-- no created_at, so each occasion is dated by its person's created_at — an
-- occasion can't predate its person, and most are added with them.
UPDATE profiles p
SET early_activated_at = coalesce(reached.at, now())
FROM (
  SELECT o.user_id, min(r.created_at) AS at
  FROM occasions o
  JOIN recipients r ON r.id = o.recipient_id
  GROUP BY o.user_id
) reached
WHERE reached.user_id = p.id
  AND p.early_activated_at IS NULL
  AND EXISTS (SELECT 1 FROM recipients r WHERE r.user_id = p.id);

UPDATE profiles p
SET qualified_trial_user_at = coalesce(
  greatest(
    (SELECT r.created_at FROM recipients r WHERE r.user_id = p.id
      ORDER BY r.created_at OFFSET 2 LIMIT 1),
    (SELECT r.created_at FROM occasions o
      JOIN recipients r ON r.id = o.recipient_id
      WHERE o.user_id = p.id
      ORDER BY r.created_at OFFSET 2 LIMIT 1),
    (SELECT min(c.created_at) FROM outbound_clicks c WHERE c.user_id = p.id)
  ),
  now()
)
WHERE p.qualified_trial_user_at IS NULL
  AND (SELECT count(*) FROM recipients r WHERE r.user_id = p.id) >= 3
  AND (SELECT count(*) FROM occasions o WHERE o.user_id = p.id) >= 3
  AND EXISTS (SELECT 1 FROM outbound_clicks c WHERE c.user_id = p.id);

CREATE OR REPLACE FUNCTION public.check_activation_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  people_count integer;
  occasions_count integer;
BEGIN
  -- Milestone plumbing must never abort the product write that triggered it.
  BEGIN
    -- Serializes evaluations per user. Without it, two concurrent inserts
    -- that jointly complete a threshold (a third occasion and a first click)
    -- each count without seeing the other's uncommitted row, and both miss
    -- the milestone. The waiter's counts below take a fresh snapshot after
    -- the lock is granted, so they see the committed row. NO KEY UPDATE
    -- doesn't conflict with the KEY SHARE locks foreign-key checks take on
    -- profiles.
    PERFORM 1 FROM profiles WHERE id = NEW.user_id FOR NO KEY UPDATE;

    SELECT count(*) INTO people_count
    FROM recipients WHERE user_id = NEW.user_id;
    SELECT count(*) INTO occasions_count
    FROM occasions WHERE user_id = NEW.user_id;

    -- The IS NULL guard is the once-per-user gate: only the run that stamps
    -- the timestamp appends the event.
    IF people_count >= 1 AND occasions_count >= 1 THEN
      UPDATE profiles SET early_activated_at = now()
      WHERE id = NEW.user_id AND early_activated_at IS NULL;
      IF FOUND THEN
        INSERT INTO product_events (user_id, event_name)
        VALUES (NEW.user_id, 'early_activated');
      END IF;
    END IF;

    IF people_count >= 3 AND occasions_count >= 3
      AND EXISTS (SELECT 1 FROM outbound_clicks WHERE user_id = NEW.user_id)
    THEN
      UPDATE profiles SET qualified_trial_user_at = now()
      WHERE id = NEW.user_id AND qualified_trial_user_at IS NULL;
      IF FOUND THEN
        INSERT INTO product_events (user_id, event_name)
        VALUES (NEW.user_id, 'qualified_trial_user_reached');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'check_activation_milestones failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activation_milestones_on_recipient ON public.recipients;
CREATE TRIGGER activation_milestones_on_recipient
  AFTER INSERT ON public.recipients
  FOR EACH ROW EXECUTE FUNCTION public.check_activation_milestones();

DROP TRIGGER IF EXISTS activation_milestones_on_occasion ON public.occasions;
CREATE TRIGGER activation_milestones_on_occasion
  AFTER INSERT ON public.occasions
  FOR EACH ROW EXECUTE FUNCTION public.check_activation_milestones();

DROP TRIGGER IF EXISTS activation_milestones_on_outbound_click ON public.outbound_clicks;
CREATE TRIGGER activation_milestones_on_outbound_click
  AFTER INSERT ON public.outbound_clicks
  FOR EACH ROW EXECUTE FUNCTION public.check_activation_milestones();
