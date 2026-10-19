-- Preservation hold for the safety procedure: while it is set, the account and
-- its people, occasions, gift suggestions, feedback, history and photos cannot
-- be deleted or edited by the user, and delete-account refuses to run. Edits
-- are blocked too because blanking a field erases it as surely as a delete.
-- It shares account_restrictions with suspension, which only the service role
-- reads.
ALTER TABLE public.account_restrictions
  ADD COLUMN IF NOT EXISTS hold_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_by text,
  ADD COLUMN IF NOT EXISTS hold_lifted_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_lifted_by text;

-- Reads only the caller's own row. authenticated needs EXECUTE because the
-- policies below call it.
CREATE OR REPLACE FUNCTION public.is_account_on_hold()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_restrictions
    WHERE user_id = auth.uid() AND hold_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_account_on_hold() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_on_hold() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.place_preservation_hold(p_user_id uuid, p_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_by), '') = '' THEN
    RAISE EXCEPTION 'hold_by is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'no auth user %', p_user_id;
  END IF;

  INSERT INTO public.account_restrictions (user_id, hold_at, hold_by, updated_at)
  VALUES (p_user_id, now(), p_by, now())
  ON CONFLICT (user_id) DO UPDATE
    SET hold_at = now(), hold_by = EXCLUDED.hold_by,
      hold_lifted_at = NULL, hold_lifted_by = NULL, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.lift_preservation_hold(p_user_id uuid, p_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(btrim(p_by), '') = '' THEN
    RAISE EXCEPTION 'lifted_by is required';
  END IF;

  UPDATE public.account_restrictions
    SET hold_at = NULL, hold_lifted_at = now(), hold_lifted_by = p_by,
      updated_at = now()
    WHERE user_id = p_user_id AND hold_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account % has no hold to lift', p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.place_preservation_hold(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lift_preservation_hold(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_preservation_hold(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.lift_preservation_hold(uuid, text) TO service_role;

-- RESTRICTIVE, so they only ever take access away from the existing
-- permissive policies. Foreign-key cascades ignore RLS, so every table a
-- protected row cascades from must be listed too: gift_feedback cascades from
-- gift_suggestions, and recipients cascades to most of the rest.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recipients', 'occasions', 'gift_suggestions', 'gift_feedback',
    'gift_history'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Held accounts cannot delete" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Held accounts cannot delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT (SELECT public.is_account_on_hold()))',
      t
    );
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'recipients', 'occasions', 'gift_suggestions', 'gift_feedback',
    'gift_history', 'profiles', 'user_preferences'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Held accounts cannot update" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Held accounts cannot update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT public.is_account_on_hold()))',
      t
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Held accounts cannot delete" ON storage.objects;
CREATE POLICY "Held accounts cannot delete" ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT (SELECT public.is_account_on_hold()));

DROP POLICY IF EXISTS "Held accounts cannot replace uploads" ON storage.objects;
CREATE POLICY "Held accounts cannot replace uploads" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT (SELECT public.is_account_on_hold()));
