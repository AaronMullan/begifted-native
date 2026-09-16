-- subscription_end_date joins the re-identify set: the cancellation email
-- quotes the date access ends, and the UPDATE OF list plus the WHEN guard are
-- what decide whether a change reaches Customer.io at all — a column absent
-- from both never re-identifies, however often it changes.
DROP TRIGGER IF EXISTS customerio_sync_on_profile_update ON public.profiles;

CREATE TRIGGER customerio_sync_on_profile_update
  AFTER UPDATE OF
    full_name,
    trial_status,
    trial_start_date,
    trial_end_date,
    account_status,
    early_activated_at,
    qualified_trial_user_at,
    subscription_status,
    subscription_plan,
    subscription_end_date,
    marketing_email_status,
    lifecycle_email_status
  ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.trial_status IS DISTINCT FROM NEW.trial_status OR
    OLD.trial_start_date IS DISTINCT FROM NEW.trial_start_date OR
    OLD.trial_end_date IS DISTINCT FROM NEW.trial_end_date OR
    OLD.account_status IS DISTINCT FROM NEW.account_status OR
    OLD.early_activated_at IS DISTINCT FROM NEW.early_activated_at OR
    OLD.qualified_trial_user_at IS DISTINCT FROM NEW.qualified_trial_user_at OR
    OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
    OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan OR
    OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date OR
    OLD.marketing_email_status IS DISTINCT FROM NEW.marketing_email_status OR
    OLD.lifecycle_email_status IS DISTINCT FROM NEW.lifecycle_email_status
  )
  EXECUTE FUNCTION public.notify_customerio_sync();
