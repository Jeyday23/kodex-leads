-- Profile provisioning and self-access.
--
-- Three gaps this closes, all found against the live database:
--
--  1. `profiles` had row level security enabled with ZERO policies, i.e. deny
--     all. Authorization reads the caller's own profile row through the user's
--     anon-key session, so that read always returned nothing and every account
--     resolved to the default role. No one could reach /admin/*.
--
--  2. There was no trigger on auth.users, so signing up never created a
--     profiles row. Three confirmed auth users existed with zero profiles.
--
--  3. Existing users therefore need a backfill.
--
-- The self-select policy is deliberately `id = auth.uid()` only. A policy that
-- inspects profiles to decide access to profiles recurses infinitely; the
-- service role bypasses RLS and covers every administrative read.

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Provision a profile for every new account. SECURITY DEFINER because the
-- signing-up user has no rights on public.profiles yet.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    -- Never read a role from user metadata: it is client-writable at signup.
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill accounts created before the trigger existed.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data ->> 'full_name', ''),
  'member'
from auth.users u
where u.email is not null
on conflict (id) do nothing;

notify pgrst, 'reload schema';
