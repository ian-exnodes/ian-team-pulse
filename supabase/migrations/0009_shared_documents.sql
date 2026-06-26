-- ============================================================
-- 0009_shared_documents.sql - team-shared file library.
-- Run in the Supabase SQL editor (after 0008).
-- ============================================================

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "team can read documents" on public.documents
  for select to authenticated using (true);

create policy "authenticated can upload" on public.documents
  for insert to authenticated
  with check (uploaded_by = (select auth.uid()));

create policy "anyone can delete documents" on public.documents
  for delete to authenticated using (true);

alter publication supabase_realtime add table public.documents;

-- Private storage bucket: reads require signed URLs.
insert into storage.buckets (id, name, public)
values ('shared-documents', 'shared-documents', false)
on conflict (id) do nothing;

create policy "authenticated can upload documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shared-documents');

create policy "authenticated can download documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'shared-documents');

create policy "authenticated can delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shared-documents');
