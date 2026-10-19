-- The profiles RLS policies let a user write any column of their own row, and
-- is_admin gates the "Admins can read all ..." policies, so without this guard
-- any signed-in user could grant themselves read access to every account.
-- Account, trial, subscription and milestone columns are likewise set only by
-- the server: the be-gifted Stripe webhook (service role) and SECURITY DEFINER
-- functions such as check_activation_milestones. Inside a SECURITY DEFINER
-- function current_user is the function owner, so those writes pass; this
-- function must stay SECURITY INVOKER for the same reason.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_admin
      OR NEW.account_status IS NOT NULL
      OR NEW.trial_status IS NOT NULL
      OR NEW.trial_start_date IS NOT NULL
      OR NEW.trial_end_date IS NOT NULL
      OR NEW.stripe_customer_id IS NOT NULL
      OR NEW.stripe_subscription_id IS NOT NULL
      OR NEW.stripe_price_id IS NOT NULL
      OR NEW.subscription_status IS NOT NULL
      OR NEW.subscription_plan IS NOT NULL
      OR NEW.subscription_start_date IS NOT NULL
      OR NEW.subscription_end_date IS NOT NULL
      OR NEW.early_activated_at IS NOT NULL
      OR NEW.qualified_trial_user_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'profile column is server-managed'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.account_status IS DISTINCT FROM OLD.account_status
    OR NEW.trial_status IS DISTINCT FROM OLD.trial_status
    OR NEW.trial_start_date IS DISTINCT FROM OLD.trial_start_date
    OR NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
    OR NEW.subscription_start_date IS DISTINCT FROM OLD.subscription_start_date
    OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
    OR NEW.early_activated_at IS DISTINCT FROM OLD.early_activated_at
    OR NEW.qualified_trial_user_at IS DISTINCT FROM OLD.qualified_trial_user_at
  THEN
    RAISE EXCEPTION 'profile column is server-managed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileged_columns();
