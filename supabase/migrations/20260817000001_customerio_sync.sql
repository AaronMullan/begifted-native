-- Push product events and profile lifecycle changes to Customer.io as they
-- happen: pg_net triggers POST each change to the customerio-sync edge
-- function, which owns the Track API calls and the recipient-data exclusion
-- allowlists.
--
-- The shared secret lives in Vault under 'customerio_sync_secret' (and as the
-- CUSTOMERIO_SYNC_SECRET edge-function secret). The function is deployed with
-- --no-verify-jwt, so this header is what authenticates the webhook.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_customerio_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_secret text;
BEGIN
  -- The exception guard keeps sync plumbing from ever aborting the write that
  -- triggered it — same contract as log_signed_up_event.
  BEGIN
    SELECT decrypted_secret INTO sync_secret
    FROM vault.decrypted_secrets
    WHERE name = 'customerio_sync_secret';

    IF sync_secret IS NULL THEN
      RAISE WARNING 'notify_customerio_sync: customerio_sync_secret not in vault';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://qgcyndtymegkobgfcpdh.supabase.co/functions/v1/customerio-sync',
      body := jsonb_build_object(
        'source', TG_TABLE_NAME,
        'record', to_jsonb(NEW)
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', sync_secret
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_customerio_sync failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customerio_sync_on_product_event ON public.product_events;
CREATE TRIGGER customerio_sync_on_product_event
  AFTER INSERT ON public.product_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_customerio_sync();

-- Profile changes re-identify the user so Customer.io attributes stay current.
-- Split INSERT/UPDATE triggers because a WHEN guard referencing OLD is invalid
-- on INSERT. The WHEN guard is what actually limits traffic to real value
-- changes: UPDATE OF alone fires whenever a column merely appears in the SET
-- list, and the app's profile save writes every field on every save.
DROP TRIGGER IF EXISTS customerio_sync_on_profile_change ON public.profiles;
DROP TRIGGER IF EXISTS customerio_sync_on_profile_insert ON public.profiles;
DROP TRIGGER IF EXISTS customerio_sync_on_profile_update ON public.profiles;

CREATE TRIGGER customerio_sync_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_customerio_sync();

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
    OLD.marketing_email_status IS DISTINCT FROM NEW.marketing_email_status OR
    OLD.lifecycle_email_status IS DISTINCT FROM NEW.lifecycle_email_status
  )
  EXECUTE FUNCTION public.notify_customerio_sync();
