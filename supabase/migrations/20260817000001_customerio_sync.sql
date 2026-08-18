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
-- The UPDATE trigger fires only on the columns the sync actually sends;
-- unrelated profile edits (avatar, notification prefs) don't generate traffic.
DROP TRIGGER IF EXISTS customerio_sync_on_profile_change ON public.profiles;
CREATE TRIGGER customerio_sync_on_profile_change
  AFTER INSERT OR UPDATE OF
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
  FOR EACH ROW EXECUTE FUNCTION public.notify_customerio_sync();
