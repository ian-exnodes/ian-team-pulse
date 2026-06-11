# User Profile Editor — Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Let a signed-in user change their avatar (photo upload) and display name from
the dashboard, with changes visible to the whole team in real time.

## Entry point

The header shows the current user's avatar (24px round, initials placeholder
when unset) next to the display name. The avatar is a button
(`aria-label="Edit profile"`, pencil hint on hover) that opens the
**Edit profile** modal. Profile cards are not clickable for this.

## Edit profile modal

Same visual pattern as the existing Report modal (overlay, rounded panel,
Escape/overlay-click to close). Contents:

- 96px round avatar preview (current avatar, or initials placeholder).
- **Choose photo** button wrapping a hidden `<input type="file"
  accept="image/jpeg,image/png,image/webp,image/gif">`.
- **Display name** text input, pre-filled, validated 1–80 chars after trim
  (mirrors the DB CHECK constraint). Save disabled while invalid.
- **Save** / **Cancel** buttons. Save shows a busy state while uploading.

## Image handling (client-side)

New helper `lib/avatar.ts`:

- `prepareAvatar(file: File): Promise<Blob>` —
  - JPEG/PNG/WebP: draw onto a canvas, center-crop to square, downscale to
    256×256, export JPEG quality 0.85. Rejects non-decodable files.
  - GIF: returned as-is (a canvas pass would freeze the animation to its
    first frame), but rejected over 3 MB with a clear error message.
- `avatarPublicUrl(baseUrl: string, userId: string, version: number): string`
  — returns `{baseUrl}/storage/v1/object/public/avatars/{userId}?v={version}`.

The preview updates immediately from the prepared blob (object URL) — GIFs
animate in the preview. Nothing is uploaded until Save.

## Save flow

1. If a new photo was chosen: `supabase.storage.from("avatars")
   .upload(userId, blob, { upsert: true, contentType })` where contentType
   is `image/jpeg` or `image/gif`. The path is the bare user id (no
   extension) so switching between formats still overwrites the same
   object — one file per user, no orphans. Browsers render it from the
   stored Content-Type, not the path.
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
  - insert/update for authenticated users where `name = auth.uid()::text`
    (each user owns exactly their one file).
  - public/anon select (bucket is public; avatars render via plain `<img>`).
- No changes to `profiles` — the existing "update own profile" RLS policy
  and the display_name CHECK already cover the row update.

## Out of scope (YAGNI)

- Crop UI / zooming — auto center-crop only (GIFs not cropped at all).
- Avatar removal ("reset to initials") — can be added later.
- Server-side validation/moderation — trusted small team, RLS bounds writes.
- GIF downscaling — would require a gif encoder dependency; the 3 MB cap
  bounds cost instead.

## Testing

- `lib/__tests__/avatar.test.ts`: `avatarPublicUrl` formatting;
  `prepareAvatar` GIF pass-through and the 3 MB rejection; resize geometry
  (square output, 256px) where canvas is available, otherwise skipped.
- Modal/save flow is thin UI over existing tested patterns; manual check.

## Components touched

| File | Change |
| --- | --- |
| `supabase/migrations/0006_avatars_bucket.sql` | new bucket + policies |
| `lib/avatar.ts` | new prepare (resize/GIF) + URL helpers |
| `components/ProfileEditModal.tsx` | new modal |
| `components/Header.tsx` | avatar button (opens modal) next to the name |
| `components/Dashboard.tsx` | modal state, save handler (optimistic + rollback) |
