-- A device push token belongs to whichever account is signed in on that device.
-- The client cannot move a token itself: user_push_tokens' RLS policy checks
-- auth.uid() against the row's existing owner, so an upsert of a token another
-- account already holds fails, and the previous account keeps receiving this
-- device's pushes while the current one receives none.
--
-- security definer so the conflict update may re-home a row owned by another
-- user. The owner is always auth.uid(), never a caller-supplied id, so a caller
-- can only claim a token for itself.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'register_push_token requires an authenticated session';
  end if;

  insert into public.user_push_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), p_token, p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
