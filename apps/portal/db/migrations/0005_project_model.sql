-- KAR-39: the project model. On brief approval a meeting attaches to (or
-- creates) a PROJECT — the durable entity that owns phase, site state, brief
-- versions and the publish location. A project can have many meeting rooms
-- (kind: brief | revision | review) in the future.

alter table project add column if not exists slug text unique;
alter table project add column if not exists phase text not null default 'BRIEF';
alter table project add column if not exists current_site jsonb;
alter table project add column if not exists r2_prefix text;
alter table project add column if not exists updated_at timestamptz not null default now();

alter table meeting_session add column if not exists kind text not null default 'brief';

alter table brief add column if not exists project_id uuid references project (id) on delete set null;
