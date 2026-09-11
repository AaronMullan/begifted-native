-- Support for the Stripe webhook that lives in the be-gifted repo
-- (app/api/webhooks/stripe/route.ts). Two pieces:
--
-- 1. stripe_webhook_events — one row per Stripe event, keyed by Stripe's event
--    id, so redeliveries are idempotent and every checkout is visible even
--    when the runtime logs are gone. The row is inserted before processing
--    and its outcome updated after, so a crash mid-way leaves 'received',
--    which a redelivery reprocesses.
-- 2. find_user_id_by_email — the only join between a Stripe customer and a
--    BeGifted account is the checkout email, and auth.users is not reachable
--    through PostgREST. SECURITY DEFINER lets the service role look it up;
--    execute is revoked from app roles so no client can probe which emails
--    have accounts.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- The checkout email, kept so an unmatched subscription can be reconciled
  -- by hand (see docs/subscription-web-checkout.md in be-gifted).
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- received: inserted, not yet processed (or processing crashed)
  -- processed: entitlement written
  -- ignored: an event type the handler does not act on
  -- unmatched: no account has the checkout email; kept for reconciliation
  -- error: processing threw; the webhook answered 500 so Stripe retries
  outcome TEXT NOT NULL DEFAULT 'received'
    CHECK (outcome IN ('received', 'processed', 'ignored', 'unmatched', 'error')),
  detail TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_outcome_idx
  ON public.stripe_webhook_events (outcome);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_user_id_idx
  ON public.stripe_webhook_events (user_id);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON public.stripe_webhook_events (received_at);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admins read all; no INSERT/UPDATE/DELETE policy, so only the service role
-- (the webhook) writes.
DROP POLICY IF EXISTS "Admins can read stripe webhook events"
  ON public.stripe_webhook_events;
CREATE POLICY "Admins can read stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
    AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO service_role;
