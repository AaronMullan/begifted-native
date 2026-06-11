-- Fix "Database error saving new user" on signup.
--
-- 20260605000002_reship_drop_unused_reminder_prefs.sql dropped reminder_days
-- from user_preferences, but ensure_user_preferences_for_profile() (created in
-- the be-gifted repo, 007_sync_user_preferences.sql) still inserts that column.
-- Since the drop executed on 2026-06-05, every signup aborts with SQLSTATE 42703
-- inside the auth transaction and GoTrue returns 500 "Database error saving new
-- user". Redefine the function without the dead column.

CREATE OR REPLACE FUNCTION public.ensure_user_preferences_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    spending_tendencies,
    auto_fallback_enabled,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NULL,
    false,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
