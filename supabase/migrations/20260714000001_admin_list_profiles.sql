-- Admin-only profile listing that includes the account email. profiles has no
-- email column — email lives in auth.users, which client RLS can't reach — so
-- a SECURITY DEFINER function does the join, gated on is_admin(). Non-admins
-- get an empty set.
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  email text
) AS $$
  SELECT p.id, p.full_name, p.username, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE public.is_admin()
  ORDER BY lower(coalesce(p.full_name, u.email::text)) ASC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
