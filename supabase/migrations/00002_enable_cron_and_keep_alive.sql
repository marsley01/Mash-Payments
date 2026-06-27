-- Enable pg_cron for scheduled jobs
create extension if not exists pg_cron;

-- Enable pg_net for HTTP requests from cron
create extension if not exists pg_net;

-- ──────────────────────────────────────────────
-- Keep-alive job: every 4 minutes
-- Prevents Supabase free-tier from pausing the
-- project due to inactivity ("antigravity").
-- ──────────────────────────────────────────────
select cron.schedule(
  'keep-alive',
  '*/4 * * * *',
  $$ select count(*) from profiles $$
);

-- ──────────────────────────────────────────────
-- Weekly reindex: every Sunday at 4:00 AM (GMT)
-- Prevents index bloat on high-write tables.
-- ──────────────────────────────────────────────
select cron.schedule(
  'weekly-reindex',
  '0 4 * * 0',
  $$
    reindex table profiles;
    reindex table daraja_credentials;
    reindex table transactions;
  $$
);
