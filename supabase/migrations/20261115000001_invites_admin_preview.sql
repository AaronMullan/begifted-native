-- Admins can create invites while the global switch is off, so the invite
-- flow can be verified on device against production before everyone gets it.
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
  IF NOT (SELECT invites_enabled FROM public.app_config WHERE id = 1)
     AND NOT COALESCE(
       (SELECT is_admin FROM public.profiles WHERE id = uid), false
     ) THEN
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
