-- Account suspension for the safety procedure. Restriction state lives here,
-- not on profiles, because users can write their own profile row. user_id has
-- no foreign key so the record survives the account. Only the service role
-- reads or changes it, through the functions below.
CREATE TABLE IF NOT EXISTS public.account_restrictions (
  user_id uuid PRIMARY KEY,
  suspended_at timestamptz,
  suspended_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_restrictions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_restrictions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.account_restrictions TO service_role;

-- Reads only the caller's own row, so it reveals nothing about anyone else.
-- authenticated needs EXECUTE because the policies below call it.
CREATE OR REPLACE FUNCTION public.is_account_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_restrictions
    WHERE user_id = auth.uid() AND suspended_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_account_suspended() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_suspended() TO authenticated, service_role;

-- The Auth ban ends the session: getUser() starts failing at once, so every
-- edge function behind requireUser refuses, and the refresh token stops
-- working. An access token already issued is still accepted by PostgREST
-- until it expires, which is what the restrictive policies below close.
-- No notice is shown to the user.
CREATE OR REPLACE FUNCTION public.suspend_account(p_user_id uuid, p_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_by), '') = '' THEN
    RAISE EXCEPTION 'suspended_by is required';
  END IF;

  INSERT INTO public.account_restrictions (user_id, suspended_at, suspended_by, updated_at)
  VALUES (p_user_id, now(), p_by, now())
  ON CONFLICT (user_id) DO UPDATE
    SET suspended_at = now(), suspended_by = EXCLUDED.suspended_by, updated_at = now();

  -- Finite, like the Auth API's ban_duration: GoTrue scans banned_until into
  -- a Go time, which a Postgres 'infinity' would fail to load.
  UPDATE auth.users SET banned_until = now() + interval '100 years'
    WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no auth user %', p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsuspend_account(p_user_id uuid, p_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_by), '') = '' THEN
    RAISE EXCEPTION 'unsuspended_by is required';
  END IF;

  UPDATE public.account_restrictions
    SET suspended_at = NULL, suspended_by = p_by, updated_at = now()
    WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account % has no restriction to lift', p_user_id;
  END IF;

  UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.suspend_account(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsuspend_account(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_account(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unsuspend_account(uuid, text) TO service_role;

-- RESTRICTIVE policies are ANDed with the existing permissive ones, so they
-- only ever take access away. Deletes are left alone here; whether a user may
-- delete content is the preservation hold's question.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recipients', 'occasions', 'gift_feedback', 'gift_history',
    'gift_suggestions', 'profiles', 'user_preferences', 'contact_requests',
    'beta_feedback'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Suspended accounts cannot insert" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Suspended accounts cannot insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT public.is_account_suspended()))',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS "Suspended accounts cannot update" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Suspended accounts cannot update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT public.is_account_suspended()))',
      t
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Suspended accounts cannot upload" ON storage.objects;
CREATE POLICY "Suspended accounts cannot upload" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT (SELECT public.is_account_suspended()));

DROP POLICY IF EXISTS "Suspended accounts cannot replace uploads" ON storage.objects;
CREATE POLICY "Suspended accounts cannot replace uploads" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT (SELECT public.is_account_suspended()));
