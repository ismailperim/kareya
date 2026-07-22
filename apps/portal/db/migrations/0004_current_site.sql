-- KAR-41: persist the current generated Site JSON so chat revisions can patch
-- the LIVE state instead of re-assembling from the brief each time.

alter table meeting_session add column if not exists current_site jsonb;
