# User Profile Editor — Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Let a signed-in user change their avatar (photo upload) and display name from
the dashboard, with changes visible to the whole team in real time.

## Entry point

On the current user's own profile card, the avatar and name become a single
clickable area (pencil icon hint on hover, `aria-label="Edit profile"`).
Clicking opens an **Edit profile** modal. Other users' cards are unchanged.

## Edit profile modal

Same visual pattern as the existing Report modal (overlay, rounded panel,
Escape/overlay-click to close). Contents:

- 96px round avatar preview (current avatar, or initials placeholder).
- **Choose photo** button wrapping a hidden `<input type="file"
  accept="image/jpeg,image/png,image/webp">`.
- **Display name** text input, pre-filled, validated 1–80 chars after trim
  (mirrors the DB CHECK constraint). Save disabled while invalid.
- **Save** / **Cancel** buttons. Save shows a busy state while uploading.

## Image handling (client-side)

New helper `lib/avatar.ts`:

- `resizeAvatar(file: File): Promise<Blob>` — draw onto a canvas,
  center-crop to square, downscale to 256×256, export JPEG quality 0.85.
  Rejects non-decodable files.
- `avatarPublicUrl(baseUrl: string, userId: string, version: number): string`
  — returns `{baseUrl}/storage/v1/object/public/avatars/{userId}.jpg?v={version}`.

The preview updates immediately from the resized blob (object URL). Nothing
is uploaded until Save.

## Save flow

1. If a new photo was chosen: `supabase.storage.from("avatars")
   .upload(`${userId}.jpg`, blob, { upsert: true, contentType: "image/jpeg" })`.
   Fixed path per user means old avatars are overwritten — no orphans.
2. Update the profile row: `update profiles set display_name = …,
   avatar_url = <public URL with ?v=Date.now()> where id = userId`.
   The `?v=` cache-buster forces browsers past the fixed-path cache.
3. Row update is optimistic with the existing rollback dispatch pattern;
   on any failure the modal stays open and a toast explains.
4. Teammates receive the change through the existing realtime `profiles`
   binding — no new sync code.

If only the name changed, skip step 1. If only the photo changed, the name
is written anyway (no-op value), keeping the flow single-path.

## Migration `0006_avatars_bucket.sql`

- Create storage bucket `avatars`, public read.
- Policies on `storage.objects` for bucket `avatars`:
  - insert/update for authenticated users where `name` =
    `auth.uid() || '.jpg'` (each user owns exactly their file).
  - public/anon select (bucket is public; avatars render via plain `<img>`).
- No changes to `profiles` — the existing "update own profile" RLS policy
  and the display_name CHECK already cover the row update.

## Out of scope (YAGNI)

- Crop UI / zooming — auto center-crop only.
- Avatar removal ("reset to initials") — can be added later.
- Server-side validation/moderation — trusted small team, RLS bounds writes.
- Header avatar — header keeps showing the name only (it re-renders from
  the same store, so the name updates live).

## Testing

- `lib/__tests__/avatar.test.ts`: `avatarPublicUrl` formatting;
  `resizeAvatar` geometry (square output, 256px) where canvas is available,
  otherwise skipped in jsdom-less env.
- Modal/save flow is thin UI over existing tested patterns; manual check.

## Components touched

| File | Change |
| --- | --- |
| `supabase/migrations/0006_avatars_bucket.sql` | new bucket + policies |
| `lib/avatar.ts` | new resize + URL helpers |
| `components/ProfileEditModal.tsx` | new modal |
| `components/ProfileCard.tsx` | clickable avatar/name for own card |
| `components/Dashboard.tsx` | modal state, save handler (optimistic + rollback) |
