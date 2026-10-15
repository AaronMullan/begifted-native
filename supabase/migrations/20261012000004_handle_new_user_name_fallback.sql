-- Google and Apple sign-ins populate raw_user_meta_data from the provider's
-- ID token, where the display name may be keyed `name` rather than the
-- `full_name` that email sign-up writes. Read either so a social signup still
-- arrives with a name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', '')
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$function$;
