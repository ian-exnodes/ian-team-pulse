-- ============================================================
-- 0002_per_user_permissions.sql - personal data is writable only
-- by its owner; shared team_items stay writable by everyone.
-- Run in the Supabase SQL editor (after 0001_init.sql).
-- ============================================================

drop policy "authenticated full access" on public.profiles;
drop policy "authenticated full access" on public.tasks;
drop policy "authenticated full access" on public.team_items;

-- profiles: everyone reads; you update only your own row (the Off toggle).
-- Inserts stay trigger-only (security definer bypasses RLS); no deletes.
create policy "profiles readable by team" on public.profiles
  for select to authenticated
  using (true);

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tasks: everyone reads; only the assignee creates/updates their own tasks.
-- No delete policy: tasks are never deleted from the app.
create policy "tasks readable by team" on public.tasks
  for select to authenticated
  using (true);

create policy "insert own tasks" on public.tasks
  for insert to authenticated
  with check (assignee_id = (select auth.uid()));

create policy "update own tasks" on public.tasks
  for update to authenticated
  using (assignee_id = (select auth.uid()))
  with check (assignee_id = (select auth.uid()));

-- team_items: shared by design - anyone adds/toggles/dismisses, but
-- created_by must be stamped honestly.
create policy "team items readable by team" on public.team_items
  for select to authenticated
  using (true);

create policy "insert team items as yourself" on public.team_items
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "update team items" on public.team_items
  for update to authenticated
  using (true)
  with check (true);

create policy "delete team items" on public.team_items
  for delete to authenticated
  using (true);
