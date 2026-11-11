-- A friend without the app opens the invite link on the web, and installing
-- from TestFlight drops the invite code. The web page asks for the email
-- they'll sign up with instead, and an account with that email created after
-- the claim is credited to the invite.

-- Claims live apart from invites so the inviter, who can read their own
-- invite rows, never sees the addresses typed on their link. RLS with no
-- policies: only the SECURITY DEFINER functions below touch this table.
CREATE TABLE IF NOT EXISTS public.invite_claims (
  invite_id uuid NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  email text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, email)
);

CREATE INDEX IF NOT EXISTS invite_claims_email_idx
  ON public.invite_claims (email);

ALTER TABLE public.invite_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invite_claims FROM anon, authenticated;

-- Called from the web page with no session. Returns nothing, so it can't be
-- used to test whether a code exists. Every email typed on a link is kept —
-- a shared link can reach several people, and whichever of them signs up
-- first is credited — up to a cap that keeps one link from being flooded.
CREATE OR REPLACE FUNCTION public.claim_invite(invite_code text, email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized text := lower(btrim(email));
  target uuid;
BEGIN
  IF normalized IS NULL
     OR length(normalized) > 320
     OR normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN;
  END IF;

  SELECT id INTO target FROM public.invites
    WHERE code = invite_code AND accepted_at IS NULL;
  IF target IS NULL THEN
    RETURN;
  END IF;
  IF (SELECT count(*) FROM public.invite_claims WHERE invite_id = target) >= 10 THEN
    RETURN;
  END IF;

  INSERT INTO public.invite_claims (invite_id, email)
    VALUES (target, normalized)
    -- Keeps the first claim time: moving it forward on a repeat claim would
    -- put it after an account already created, and that account would never
    -- be credited. By constraint name because the `email` parameter (named
    -- for the RPC's JSON body) makes a bare column list ambiguous.
    ON CONFLICT ON CONSTRAINT invite_claims_pkey DO NOTHING;
END;
$$;

-- Credits the caller's account to an unaccepted invite claimed with their
-- email before the account existed. Claims for an accepted invite are deleted
-- with the acceptance; they have no further use.
CREATE OR REPLACE FUNCTION public.accept_invite_by_email()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  user_created timestamptz;
  target uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT lower(u.email), u.created_at INTO user_email, user_created
    FROM auth.users u
    WHERE u.id = uid AND u.created_at > now() - interval '7 days';
  IF user_email IS NULL THEN
    RETURN false;
  END IF;

  -- Shared with accept_invite, so a code and an email credit racing for the
  -- same account settle in turn instead of colliding on accepted_by.
  PERFORM pg_advisory_xact_lock(hashtext('invite-accept:' || uid::text));

  IF EXISTS (SELECT 1 FROM public.invites WHERE accepted_by = uid) THEN
    RETURN false;
  END IF;

  SELECT i.id INTO target
    FROM public.invite_claims c
    JOIN public.invites i ON i.id = c.invite_id
    WHERE c.email = user_email
      AND c.claimed_at <= user_created
      AND i.accepted_at IS NULL
      AND i.inviter_id <> uid
    ORDER BY c.claimed_at DESC
    LIMIT 1
    FOR UPDATE OF i;
  IF target IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invites
    SET accepted_by = uid,
        accepted_at = now(),
        sent_at = COALESCE(sent_at, now())
    WHERE id = target AND accepted_at IS NULL;
  DELETE FROM public.invite_claims WHERE invite_id = target;
  RETURN true;
END;
$$;

-- accept_invite again, now taking the same per-account lock as
-- accept_invite_by_email and clearing claims for the invite it accepts.
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  uid uuid := auth.uid();
  target uuid;
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

  PERFORM pg_advisory_xact_lock(hashtext('invite-accept:' || uid::text));

  IF EXISTS (SELECT 1 FROM public.invites WHERE accepted_by = uid) THEN
    RETURN false;
  END IF;

  -- accepted_at, not accepted_by: accepted_by is nulled if the friend
  -- deletes their account, and the link must stay used.
  UPDATE public.invites
    SET accepted_by = uid,
        accepted_at = now(),
        sent_at = COALESCE(sent_at, now())
    WHERE code = invite_code
      AND accepted_at IS NULL
      AND inviter_id <> uid
    RETURNING id INTO target;
  IF target IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.invite_claims WHERE invite_id = target;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_invite(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite_by_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invite(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite_by_email() TO authenticated;
