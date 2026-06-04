-- Fix infinite recursion in admin RLS policies on profiles table.
-- A SECURITY DEFINER function bypasses RLS, breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Recreate using the function instead of a subquery
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- Update other admin policies to use the function for consistency
DROP POLICY IF EXISTS "Admins can read all recipients" ON recipients;
CREATE POLICY "Admins can read all recipients"
  ON recipients FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage test runs" ON prompt_test_runs;
CREATE POLICY "Admins can manage test runs"
  ON prompt_test_runs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage system prompt versions" ON system_prompt_versions;
CREATE POLICY "Admins can manage system prompt versions"
  ON system_prompt_versions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Set admin for aaroncmullan@gmail.com
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'aaroncmullan@gmail.com');
