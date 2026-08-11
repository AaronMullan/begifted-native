-- GTM/lifecycle schema fields on the user record (profiles), foundation for
-- source tracking, lifecycle email, and paid conversion.
-- signup_date is deliberately NOT added: it already exists as auth.users.created_at.
-- All columns are nullable with no defaults or constraints — value semantics
-- (allowed statuses, when fields are stamped) belong to the features that
-- write them, not the schema.

-- User / account state
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS early_activated_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualified_trial_user_at timestamptz;

-- Attribution
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_referrer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landing_page_variant text;

-- Subscription / Stripe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Email preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_email_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifecycle_email_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifecycle_unsubscribed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_preferences_updated_at timestamptz;
