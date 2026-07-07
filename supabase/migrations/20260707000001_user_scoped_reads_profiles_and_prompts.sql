-- Baseline RLS audit fixes (DEV-232). RLS itself is enabled on all five
-- pre-migrations core tables (profiles, recipients, user_preferences,
-- occasions, gift_suggestions); the gaps are two world-readable SELECT
-- policies left over from the dashboard-era baseline.

-- ---------------------------------------------------------------------------
-- profiles: the Supabase starter policy "Public profiles are viewable by
-- everyone." (USING (true)) let any caller with the anon key read every row.
-- BeGifted has no social features, and profiles carry street and billing
-- addresses. Replace the world-read with a self-read. Admin screens keep
-- working through the separate is_admin() SELECT policy; backend jobs and
-- edge functions use the service role, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- system_prompt_versions: "Anyone can read system prompt versions"
-- (USING (true)) made all prompt text — active and historical — readable by
-- any caller with the anon key. The only client-side readers are admin
-- screens, covered by the "Admins can manage system prompt versions" ALL
-- policy; every backend reader (edge functions, be-gifted) uses the service
-- role.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read system prompt versions" ON public.system_prompt_versions;
