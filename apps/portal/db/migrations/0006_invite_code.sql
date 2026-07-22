-- KAR-42: DB-backed invite codes — the customer-facing access gate.
-- A code is the secret itself: redeeming one atomically consumes a use and
-- mints a fresh meeting_session. No CF Access friction on the customer side.

create table if not exists invite_code (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  -- Operator note: who this code was created for ("Ahmet - berber dükkanı").
  note        text,
  max_uses    integer not null default 1,
  used_count  integer not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
