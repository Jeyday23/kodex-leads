-- Restore the table privileges the server-side client depends on.
--
-- Root cause of "Supabase credentials detected, but authority_automation_settings
-- cannot be read": `service_role` held only REFERENCES/TRIGGER/TRUNCATE on 67 of
-- the public tables and had no SELECT/INSERT/UPDATE/DELETE. PostgREST therefore
-- answered "permission denied for table", which the app surfaced as an
-- unreadable or missing table.
--
-- No earlier migration in this repo issues a GRANT, so every table created by
-- 010-020 has been affected since it was created. This grants the missing
-- privileges and sets default privileges so future migrations do not
-- reintroduce the gap.
--
-- Note on the privilege model: `anon` and `authenticated` already hold broad
-- DML here, which is normal for Supabase because row level security is the
-- gate. TRUNCATE is not, and is revoked below.

do $$
declare
  target record;
begin
  for target in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to service_role',
      target.relname
    );
    execute format('revoke truncate on public.%I from anon, authenticated', target.relname);
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Future objects created by migrations run as postgres.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

notify pgrst, 'reload schema';
