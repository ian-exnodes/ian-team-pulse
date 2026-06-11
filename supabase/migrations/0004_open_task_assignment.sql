-- ============================================================
-- 0004_open_task_assignment.sql - tasks become collaborative so work
-- can be assigned/reassigned by dragging. Profiles stay personal
-- (manual_status owner-only) and team_items attribution stays pinned.
-- Run in the Supabase SQL editor (after 0003).
--
-- This intentionally relaxes the per-user task lockdown from 0002:
-- any authenticated member may now create/reassign/complete any task.
-- ============================================================

drop policy "tasks readable by team" on public.tasks;
drop policy "insert own tasks" on public.tasks;
drop policy "update own tasks" on public.tasks;

-- Trusted small team: any authenticated user has full access to tasks
-- (mirrors the original 0001 policy; assignment is now a shared action).
create policy "authenticated full access" on public.tasks
  for all to authenticated using (true) with check (true);
