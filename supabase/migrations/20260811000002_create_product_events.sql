-- Product event sink: append-only stream of core lifecycle events
-- (signed_up, person_added, occasion_added, recommendations_viewed) that
-- lifecycle tooling (Customer.io) will consume. recommendation_engaged is
-- deliberately absent — outbound_clicks already captures that signal with
-- user, recipient, suggestion, and timestamp attached.
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References auth.users, not profiles: signed_up is written by a trigger on
  -- auth.users before the client has upserted a profiles row.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_user_id_idx ON product_events(user_id);
CREATE INDEX IF NOT EXISTS product_events_event_name_idx ON product_events(event_name);
CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON product_events(created_at);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

-- Append-only: users insert/read their own events; admins read all. No
-- UPDATE/DELETE policies.
CREATE POLICY "Users can insert own product events"
  ON product_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own product events"
  ON product_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all product events"
  ON product_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- signed_up is server-written: client signup can finish without a session
-- (email verification pending), so an auth.users trigger is the only point
-- that fires exactly once per new account. The inner exception guard keeps a
-- sink failure from ever aborting signup itself.
CREATE OR REPLACE FUNCTION public.log_signed_up_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.product_events (user_id, event_name)
    VALUES (NEW.id, 'signed_up');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'log_signed_up_event failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_signed_up_on_auth_user_created ON auth.users;
CREATE TRIGGER log_signed_up_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.log_signed_up_event();
