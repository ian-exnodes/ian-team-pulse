-- ============================================================
-- 0003_pin_team_item_attribution.sql - shared items stay editable
-- by everyone, but who raised them (and when) cannot be rewritten.
-- Run in the Supabase SQL editor (after 0002).
--
-- Column-level privileges compose with the permissive update policy:
-- a PATCH touching created_by/created_at now fails with a real 42501
-- error instead of silently forging attribution. Realtime delivery is
-- unaffected (it authorizes via SELECT policies only).
-- ============================================================

revoke update on public.team_items from authenticated;
grant update (type, content, link, done) on public.team_items to authenticated;
