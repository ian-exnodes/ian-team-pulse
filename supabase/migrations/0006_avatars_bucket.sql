-- ============================================================
-- 0006_avatars_bucket.sql - per-user avatars in storage.
-- Run in the Supabase SQL editor (after 0005).
--
-- Avatars: one public image per user, stored at the bare user id (no
-- extension) so switching jpg <-> gif overwrites the same object.
--
-- Public bucket: reads go through the public object URL, which bypasses
-- storage.objects RLS. Writes are limited to your own single object.
-- The select policy is NOT for rendering - upload({ upsert: true })
-- takes an insert-on-conflict path that must read the existing row, so
-- without it re-uploads fail with an RLS violation.
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

create policy "read own avatar" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text);
