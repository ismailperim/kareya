-- KAR-26: live brief draft for resume. Mutable snapshot updated on every tool
-- call so a reload / reconnect can rehydrate the panel and give the agent
-- resume context. The versioned `brief` table remains for finalized snapshots.

alter table meeting_session add column if not exists current_brief jsonb;
