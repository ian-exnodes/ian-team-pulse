-- ============================================================
-- 0005_jira_connections.sql - per-user Jira OAuth tokens.
-- Run in the Supabase SQL editor (after 0004).
--
-- These rows hold OAuth access/refresh tokens - SECRETS. The table is
-- server-only: RLS is enabled with NO client policies and grants are
-- revoked from anon/authenticated, so the browser can never read it.
-- Only the server routes (app/api/jira/*) touch it via the service-role
-- key, which bypasses RLS.
-- ============================================================

create table public.jira_connections (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  cloud_id        text not null,
  site_url        text not null,
  jira_account_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger jira_connections_set_updated_at
  before update on public.jira_connections
  for each row execute function public.set_updated_at();

-- Lock it down: server-only. RLS on + no policies + no client grants.
alter table public.jira_connections enable row level security;
revoke all on public.jira_connections from anon, authenticated;
