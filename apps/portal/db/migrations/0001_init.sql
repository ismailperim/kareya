-- KAR-20: meeting + brief persistence (Neon Postgres).
-- Idempotent (IF NOT EXISTS) so re-runs are safe. Auth/RLS come in a later
-- ticket; access is server-route only for now.

create table if not exists project (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists meeting_session (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references project (id) on delete set null,
  token       text not null unique,
  -- Workflow phase (state machine): BRIEF -> PROPOSED -> ... (DESIGN §2).
  phase       text not null default 'BRIEF',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Versioned Brief v1 snapshots (jsonb). One session can hold many versions.
create table if not exists brief (
  id                 uuid primary key default gen_random_uuid(),
  meeting_session_id uuid not null references meeting_session (id) on delete cascade,
  version            integer not null,
  data               jsonb not null,
  created_at         timestamptz not null default now(),
  unique (meeting_session_id, version)
);

-- Append-only log of update_brief / update_section / append_note tool-calls.
create table if not exists brief_event (
  id                 uuid primary key default gen_random_uuid(),
  meeting_session_id uuid not null references meeting_session (id) on delete cascade,
  kind               text not null default 'update_brief',
  field              text,
  value              text,
  payload            jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists brief_event_session_idx on brief_event (meeting_session_id, created_at);
