-- ============================================================
-- 0007_activity_log.sql - shared, timestamped feed of member activity.
-- Run in the Supabase SQL editor (after 0006).
--
-- Rows are written ONLY by SECURITY DEFINER triggers (capturing the actor
-- via auth.uid()), never by clients. Everyone authenticated can read it.
-- `detail` snapshots the title/content so it survives the row's deletion.
-- ============================================================

create table public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles (id) on delete set null,
  type           text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  entity_id      uuid,
  detail         text,
  meta           jsonb,
  created_at     timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);

-- Read-only to clients (shared feed); only the trigger functions insert.
alter table public.activity_log enable row level security;
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

create policy "activity readable by team" on public.activity_log
  for select to authenticated using (true);

alter publication supabase_realtime add table public.activity_log;

-- ------------------------------------------------------------
-- Trigger functions (SECURITY DEFINER so they can write the locked table;
-- auth.uid() still resolves to the calling user).
-- ------------------------------------------------------------

create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, type, target_user_id, entity_id, detail)
    values (
      auth.uid(),
      'task_added',
      -- only record a target when the task was created for someone else
      case when new.assignee_id is distinct from auth.uid() then new.assignee_id end,
      new.id,
      new.title
    );
  elsif tg_op = 'UPDATE' then
    if new.assignee_id is distinct from old.assignee_id then
      insert into public.activity_log (actor_id, type, target_user_id, entity_id, detail)
      values (auth.uid(), 'task_assigned', new.assignee_id, new.id, new.title);
    end if;
    if new.status is distinct from old.status then
      insert into public.activity_log (actor_id, type, entity_id, detail)
      values (
        auth.uid(),
        case when new.status = 'done' then 'task_done' else 'task_reopened' end,
        new.id,
        new.title
      );
    end if;
  end if;
  return null;
end;
$$;

create trigger tasks_activity
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();

create or replace function public.log_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.manual_status is distinct from old.manual_status then
    insert into public.activity_log (actor_id, type, entity_id)
    values (
      auth.uid(),
      case when new.manual_status = 'off' then 'status_off' else 'status_back' end,
      new.id
    );
  end if;
  return null;
end;
$$;

create trigger profiles_activity
  after update of manual_status on public.profiles
  for each row execute function public.log_profile_activity();

create or replace function public.log_team_item_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, type, entity_id, detail)
    values (
      auth.uid(),
      case when new.type = 'tbd' then 'tbd_raised' else 'todo_added' end,
      new.id,
      new.content
    );
  elsif tg_op = 'UPDATE' then
    -- a resolved blocker (moved to the todolist, or simply checked off)
    if old.type = 'tbd' and new.type = 'todo' then
      insert into public.activity_log (actor_id, type, entity_id, detail)
      values (auth.uid(), 'tbd_resolved', new.id, new.content);
    elsif new.done is distinct from old.done and new.done then
      insert into public.activity_log (actor_id, type, entity_id, detail)
      values (
        auth.uid(),
        case when new.type = 'tbd' then 'tbd_resolved' else 'todo_checked' end,
        new.id,
        new.content
      );
    end if;
  elsif tg_op = 'DELETE' then
    insert into public.activity_log (actor_id, type, entity_id, detail)
    values (
      auth.uid(),
      case when old.type = 'tbd' then 'tbd_dismissed' else 'todo_deleted' end,
      old.id,
      old.content
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger team_items_activity
  after insert or update or delete on public.team_items
  for each row execute function public.log_team_item_activity();
