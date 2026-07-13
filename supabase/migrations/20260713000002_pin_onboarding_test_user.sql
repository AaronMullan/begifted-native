-- Dedicated onboarding test accounts: any auth user whose email matches
-- aaroncmullan+onboarding%@gmail.com is pinned to onboarding_completed = false.
-- The client writes onboarding_completed = true at the end of the flow; this
-- trigger silently overrides it for pinned accounts, so every cold start of the
-- app routes them back to /onboarding/welcome. Pattern match (not exact email)
-- so fresh accounts (+onboarding2, +onboarding3, ...) can be spun up when a
-- clean slate is needed without touching the database.

-- security definer: the trigger fires as the authenticated PostgREST role,
-- which cannot read auth.users.
create or replace function public.reset_onboarding_for_test_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from auth.users u
    where u.id = new.user_id
      and lower(u.email) like 'aaroncmullan+onboarding%@gmail.com'
  ) then
    new.onboarding_completed := false;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_onboarding_test_user on public.user_preferences;
create trigger reset_onboarding_test_user
  before insert or update on public.user_preferences
  for each row
  execute function public.reset_onboarding_for_test_user();

-- Reset any pre-existing rows for pinned accounts so the trigger's invariant
-- holds from the moment this applies.
update public.user_preferences p
set onboarding_completed = false
from auth.users u
where u.id = p.user_id
  and lower(u.email) like 'aaroncmullan+onboarding%@gmail.com'
  and p.onboarding_completed;
