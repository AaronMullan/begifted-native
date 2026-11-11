-- A friend without the app opens the invite link on the web, and installing
-- from TestFlight drops the invite code. The web page asks for the email
-- they'll sign up with instead, and the account with that email is credited
-- on its first sign-in.

ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS claimed_email text;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS invites_claimed_email_idx
  ON public.invites (lower(claimed_email))
  WHERE claimed_email IS NOT NULL AND accepted_at IS NULL;

-- Called from the web page with no session. Returns nothing, so it can't be
-- used to test whether a code exists. A later claim replaces an earlier one
-- (a corrected typo) until the invite is accepted.
CREATE OR REPLACE FUNCTION public.claim_invite(invite_code text, email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized text := lower(btrim(email));
BEGIN
  IF normalized IS NULL
     OR length(normalized) > 320
     OR normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN;
  END IF;

  UPDATE public.invites
    SET claimed_email = normalized,
        claimed_at = now()
    WHERE code = invite_code
      AND accepted_at IS NULL;
END;
$$;

-- Credits the caller's new account to the most recent unaccepted invite
-- claimed with their email. Same rules as accept_invite: a recent account,
-- never already credited, never the inviter's own invite.
CREATE OR REPLACE FUNCTION public.accept_invite_by_email()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  updated integer;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT lower(u.email) INTO user_email FROM auth.users u
    WHERE u.id = uid AND u.created_at > now() - interval '7 days';
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.invites WHERE accepted_by = uid) THEN
    RETURN false;
  END IF;

  UPDATE public.invites
    SET accepted_by = uid,
        accepted_at = now(),
        sent_at = COALESCE(sent_at, now())
    WHERE id = (
      SELECT id FROM public.invites
      WHERE lower(claimed_email) = user_email
        AND accepted_at IS NULL
        AND inviter_id <> uid
      ORDER BY claimed_at DESC
      LIMIT 1
    )
    AND accepted_at IS NULL;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_invite(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite_by_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invite(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_email() TO authenticated;
