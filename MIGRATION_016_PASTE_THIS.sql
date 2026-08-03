alter table public.leads add column if not exists company text;

update public.leads
set company = coalesce(company, company_name, email)
where company is null;

alter table public.leads alter column company drop not null;

notify pgrst, 'reload schema';
