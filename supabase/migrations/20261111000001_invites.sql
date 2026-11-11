-- Friend invites: each user can send up to five single-use invite links.
-- Public signup is unaffected; an invite only records who brought whom in.

-- Off until the team turns it on from the admin Kill Switch screen.
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS invites_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- NULL until the share sheet reports the link went out. A link minted for a
  -- share the user cancelled is reused by their next share and never counts.
  sent_at timestamptz,
  -- UNIQUE: an account is credited to at most one inviter.
  accepted_by uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS invites_inviter_id_idx ON public.invites (inviter_id);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Read-only to the inviter; every write goes through the functions below so
-- the five-invite limit can't be bypassed by a direct insert.
DROP POLICY IF EXISTS "inviters read own invites" ON public.invites;
CREATE POLICY "inviters read own invites" ON public.invites
  FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());

-- Returns the caller's pending (unsent) invite, creating one if they have
-- sends left. Raises when invites are off or all five are sent.
CREATE OR REPLACE FUNCTION public.create_invite()
RETURNS public.invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
  result public.invites;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT (SELECT invites_enabled FROM public.app_config WHERE id = 1) THEN
    RAISE EXCEPTION 'invites are off';
  END IF;

  -- Serializes one user's invite writes so two devices can't both take the
  -- fifth slot or both mint a pending invite.
  PERFORM pg_advisory_xact_lock(hashtext('invites:' || uid::text));

  SELECT * INTO result FROM public.invites
    WHERE inviter_id = uid AND sent_at IS NULL AND accepted_by IS NULL
    LIMIT 1;
  IF FOUND THEN
    RETURN result;
  END IF;

  IF (SELECT count(*) FROM public.invites
      WHERE inviter_id = uid AND sent_at IS NOT NULL) >= 5 THEN
    RAISE EXCEPTION 'no invites left';
  END IF;

  INSERT INTO public.invites (code, inviter_id)
    VALUES (encode(extensions.gen_random_bytes(9), 'hex'), uid)
    RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Marks the caller's invite as sent once the share sheet reports success.
CREATE OR REPLACE FUNCTION public.mark_invite_sent(invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invites:' || uid::text));

  -- Already sent (a retry, or a friend accepted it first): nothing to do, and
  -- not an error — the share itself went through.
  IF NOT EXISTS (
    SELECT 1 FROM public.invites
    WHERE id = invite_id AND inviter_id = uid AND sent_at IS NULL
  ) THEN
    RETURN;
  END IF;

  IF (SELECT count(*) FROM public.invites
      WHERE inviter_id = uid AND sent_at IS NOT NULL) >= 5 THEN
    RAISE EXCEPTION 'no invites left';
  END IF;

  UPDATE public.invites SET sent_at = now()
    WHERE id = invite_id AND inviter_id = uid AND sent_at IS NULL;
END;
$$;

-- Credits the caller's new account to the invite whose link brought them in.
-- Only a recently created account qualifies, so an existing user tapping a
-- friend's link doesn't use it up. Returns true when it recorded an
-- acceptance; false (never an error) for every reason it didn't.
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
  updated integer;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = uid AND created_at > now() - interval '7 days'
  ) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.invites WHERE accepted_by = uid) THEN
    RETURN false;
  END IF;

  UPDATE public.invites
    SET accepted_by = uid,
        accepted_at = now(),
        sent_at = COALESCE(sent_at, now())
    -- accepted_at, not accepted_by: accepted_by is nulled if the friend
    -- deletes their account, and the link must stay used.
    WHERE code = invite_code
      AND accepted_at IS NULL
      AND inviter_id <> uid;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_invite_sent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invite_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
