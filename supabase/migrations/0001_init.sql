-- ============================================================
-- 0001_init.sql - Team Pulse initial schema
-- Run in the Supabase SQL editor (hosted) or via `supabase db push`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. App configuration (single row)
--    Server-side email-domain restriction for signups.
--    Restrict: update public.app_config set allowed_email_domain = 'mycompany.com';
--    Open up:  update public.app_config set allowed_email_domain = null;
--    Keep NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN (client hint) in sync.
-- ------------------------------------------------------------
create table public.app_config (
  id boolean primary key default true check (id), -- enforces exactly one row
  allowed_email_domain text
);

insert into public.app_config (id, allowed_email_domain) values (true, null);

comment on table public.app_config is
  'Single-row app settings. allowed_email_domain = null means signups are open to all domains.';

-- ------------------------------------------------------------
-- 2. Core tables
--    Pseudo-enums are TEXT + CHECK (alterable in one statement,
--    unlike pg enums).
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  avatar_url    text,
  manual_status text check (manual_status in ('off')), -- null = status auto-derived
  created_at    timestamptz not null default now()
);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  link         text,
  status       text not null default 'inprogress' check (status in ('inprogress', 'done')),
  assignee_id  uuid not null references public.profiles (id) on delete cascade,
  created_by   uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.team_items (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('todo', 'tbd')),
  content    text not null check (char_length(content) between 1 and 500),
  link       text,
  done       boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index tasks_assignee_id_idx  on public.tasks (assignee_id);
create index tasks_status_idx       on public.tasks (status);
create index tasks_completed_at_idx on public.tasks (completed_at desc);
create index team_items_type_idx    on public.team_items (type);

-- ------------------------------------------------------------
-- 3. Trigger functions
--    Inserts into auth.users run as supabase_auth_admin, which has
--    no grants on public => SECURITY DEFINER + empty search_path +
--    fully qualified names.
-- ------------------------------------------------------------

-- 3a. Email domain restriction (BEFORE INSERT on auth.users).
-- GoTrue surfaces a raised exception as a generic 500, so the app
-- pre-validates the domain client-side; this is the enforcement backstop.
create or replace function public.check_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed text;
begin
  select c.allowed_email_domain into allowed
  from public.app_config c
  limit 1;

  -- Unset / blank => signups open to everyone.
  if allowed is null or btrim(allowed) = '' then
    return new;
  end if;

  -- Non-email signups (phone, anonymous) are not restricted.
  if new.email is null then
    return new;
  end if;

  if lower(split_part(new.email, '@', 2)) = lower(btrim(allowed)) then
    return new;
  end if;

  raise exception 'Signups are restricted to @% email addresses', btrim(allowed)
    using errcode = 'P0001';
end;
$$;

create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.check_email_domain();

-- 3b. Auto-create profile (AFTER INSERT on auth.users).
-- Kept tiny and written so it cannot raise: a failure here would block
-- ALL signups. left(..., 80) keeps any metadata-provided name within the
-- display_name CHECK constraint.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Teammate'
      ),
      80
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3c. updated_at maintenance on tasks.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 3d. Keep completed_at consistent with status (server-side backstop;
-- the app also sets both optimistically). Respects an explicitly
-- supplied completed_at when status = 'done'.
create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completed_at
  before insert or update of status, completed_at on public.tasks
  for each row execute function public.sync_task_completed_at();

-- ------------------------------------------------------------
-- 4. Row Level Security + grants
--    Supabase needs BOTH layers: table grants (privileges) and
--    RLS policies (rows). anon gets neither.
-- ------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.tasks      enable row level security;
alter table public.team_items enable row level security;
alter table public.app_config enable row level security;

revoke all on public.profiles, public.tasks, public.team_items, public.app_config from anon;
-- app_config is server-only: clients never read it (the UI uses the env var).
revoke all on public.app_config from authenticated;

grant select, insert, update, delete
  on public.profiles, public.tasks, public.team_items
  to authenticated;

-- Trusted small team: any authenticated user has full access.
create policy "authenticated full access" on public.profiles
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.tasks
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.team_items
  for all to authenticated using (true) with check (true);

-- No policies on app_config => inaccessible to client roles.

-- ------------------------------------------------------------
-- 5. Realtime
--    Default replica identity (primary key) is sufficient: with RLS
--    enabled, DELETE payloads are PK-only regardless, and the client
--    only needs old.id.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime
  add table public.profiles, public.tasks, public.team_items;
