-- Per-user display name color. Null means "use the app default color".
-- Stored as a #rrggbb hex string; the CHECK keeps stray values out.
alter table public.profiles
  add column if not exists name_color text;

alter table public.profiles
  add constraint profiles_name_color_format
  check (name_color is null or name_color ~ '^#[0-9a-fA-F]{6}$');
