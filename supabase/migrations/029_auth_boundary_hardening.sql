-- Harden the authentication boundary without changing the signup flow.
--
-- `handle_new_auth_user` must remain SECURITY DEFINER because an auth.users
-- trigger provisions the matching profile row. It must not, however, be a
-- callable Data API RPC. Trigger execution does not require API roles to have
-- EXECUTE on the function.

alter function public.handle_new_auth_user() set search_path = '';

revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

-- Make the intended audience explicit. The ownership predicates remain the
-- authorization boundary, and UPDATE keeps both USING and WITH CHECK so a
-- caller cannot reassign a profile row.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

notify pgrst, 'reload schema';
