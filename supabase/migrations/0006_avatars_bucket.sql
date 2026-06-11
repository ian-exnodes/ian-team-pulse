-- ============================================================
-- 0006_avatars_bucket.sql - per-user avatars in storage.
-- Run in the Supabase SQL editor (after 0005).
--
-- Avatars: one public image per user, stored at the bare user id (no
-- extension) so switching jpg <-> gif overwrites the same object.
--
-- Public bucket: reads go through the public object URL, which bypasses
-- storage.objects RLS - no select policy is needed. Writes are limited
-- to your own single object.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text);

create policy "replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text);
