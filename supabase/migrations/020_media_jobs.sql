create table if not exists public.media_jobs (
  id uuid primary key,
  title text not null,
  source_type text not null default 'manual',
  source_id text,
  kind text not null check (kind in ('image', 'video')),
  aspect_ratio text not null default '1:1',
  brief text not null,
  prompt text not null,
  provider text not null default 'queue-only',
  model text,
  provider_request_id text,
  provider_status_url text,
  result_url text,
  status text not null default 'pending_generation',
  error text,
  created_by text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_jobs_status_created_idx on public.media_jobs(status, created_at desc);
create index if not exists media_jobs_source_idx on public.media_jobs(source_type, source_id) where source_id is not null;

alter table public.media_jobs enable row level security;

comment on table public.media_jobs is 'Audited Authority Engine media generation and founder approval queue. Server writes use the service-role client.';
