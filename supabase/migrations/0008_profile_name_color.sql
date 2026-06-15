-- ============================================================
-- 0008_profile_name_color.sql - per-user display name color.
-- Run in the Supabase SQL editor (after 0007).
--
-- Null means "use the app default color". Stored as a #rrggbb hex
-- string; the CHECK keeps stray values out.
-- ============================================================

alter table public.profiles
  add column if not exists name_color text;

alter table public.profiles
  drop constraint if exists profiles_name_color_format;

alter table public.profiles
  add constraint profiles_name_color_format
  check (name_color is null or name_color ~ '^#[0-9a-fA-F]{6}$');
