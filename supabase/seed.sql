-- ============================================================
-- seed.sql - SAMPLE DATA for Team Pulse
--
-- Creates 3 sample team members + tasks + team items.
--
-- CAVEAT: section 1 writes directly into the auth schema. That is an
-- unsupported, version-sensitive surface (GoTrue may change columns),
-- but it works today in the hosted SQL editor and with local
-- `supabase db reset`. It is sample data only - real teammates sign
-- in with magic links. If section 1 ever fails on a newer Supabase,
-- create 3 users in Dashboard -> Authentication -> Add user instead,
-- then run sections 2-3 with those users' UUIDs.
--
-- Sample users can also log in with password 'password123' if
-- email+password auth is enabled (handy for local development).
-- ============================================================

-- ---------- 1. Auth users (the trigger auto-creates their profiles) ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'an@example.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"An Nguyen"}'::jsonb,
   now(), now(), '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'binh@example.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Binh Tran"}'::jsonb,
   now(), now(), '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-4333-8333-333333333333',
   'authenticated', 'authenticated', 'chi@example.com',
   extensions.crypt('password123', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Chi Pham"}'::jsonb,
   now(), now(), '', '', '', '', '');

-- GoTrue expects a matching identities row per email user.
-- provider_id (NOT NULL) = user uuid as text; identity_data needs sub + email.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
);

-- Profiles were created by the on_auth_user_created trigger.
-- Give one member a manual Off status to demo the override.
update public.profiles
set manual_status = 'off'
where id = '33333333-3333-4333-8333-333333333333';

-- ---------- 2. Tasks ----------
-- completed_at values are now()-relative so "Done today" is non-empty
-- whenever you run this seed.
insert into public.tasks (title, link, status, assignee_id, created_by, completed_at)
values
  ('Fix bug review module',
   'https://careforkids.atlassian.net/browse/CPD-3481',
   'done', '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111', now() - interval '1 hour'),
  ('Implement popup Sentiment ratings',
   'https://careforkids.atlassian.net/browse/CPD-3463',
   'inprogress', '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111', null),
  ('Update onboarding docs',
   null,
   'inprogress', '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222', null),
  ('Review staging deploy checklist',
   null,
   'done', '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222', now() - interval '3 hours'),
  ('Migrate cron jobs',
   'https://careforkids.atlassian.net/browse/CPD-3470',
   'inprogress', '33333333-3333-4333-8333-333333333333',
   '33333333-3333-4333-8333-333333333333', null);

-- ---------- 3. Team items (todolist + TBD blockers) ----------
insert into public.team_items (type, content, link, done, created_by, created_at)
values
  ('todo', 'Book meeting room for sprint review', null, false,
   '11111111-1111-4111-8111-111111111111', now() - interval '5 hours'),
  ('todo', 'Rotate on-call schedule', null, true,
   '22222222-2222-4222-8222-222222222222', now() - interval '1 day'),
  ('tbd', 'Waiting on design sign-off for Sentiment popup',
   'https://careforkids.atlassian.net/browse/CPD-3463', false,
   '11111111-1111-4111-8111-111111111111', now() - interval '2 hours'),
  ('tbd', 'Staging database credentials expired - who owns renewal?', null, false,
   '22222222-2222-4222-8222-222222222222', now() - interval '30 minutes');
