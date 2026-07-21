-- KAR-45: job queue for the workflow engine (ADR-0006). The portal Worker
-- enqueues; the build runner claims with FOR UPDATE SKIP LOCKED (single
-- statement, safe with the Neon HTTP driver).

create table if not exists job (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'queued', -- queued | running | done | failed
  attempts    integer not null default 0,
  logs        text not null default '',
  result      jsonb,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

create index if not exists job_status_idx on job (status, created_at);
