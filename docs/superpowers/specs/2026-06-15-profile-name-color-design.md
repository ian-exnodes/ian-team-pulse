# Profile name color — design

**Date:** 2026-06-15
**Status:** Approved, ready for implementation plan

## Goal

Let a user pick a color for their own display name. Offer a small set of
common preset colors that read well on the dark theme, plus a native color
picker for any specific color. The chosen color becomes part of the user's
identity and appears everywhere their name is rendered in the UI.

## Scope

The color applies at every place a name is rendered as DOM:

| Site | File | Current color |
|------|------|---------------|
| Member card name + initials fallback | `components/ProfileCard.tsx` (name ~L71, initials ~L67) | `olivia-cream` / `olivia-pink` |
| Header name + initials fallback | `components/Header.tsx` (name ~L73, initials ~L63) | cream / pink |
| Activity log name segments | `components/ActivityLog.tsx` (~L124) | you=`olivia-pink`, others=`status-chill` |
| TBD "raised by" attribution | `components/TbdList.tsx` (~L41) | muted text |
| Edit-modal initials preview | `components/ProfileEditModal.tsx` (~L149) | pink |

Out of scope: OS/browser notification bodies (`components/Dashboard.tsx` ~L278)
are plain text strings, not DOM, so they cannot be colored and are left as-is.

## Data model

Add a nullable column to `profiles`:

- `name_color text` — a `#rrggbb` hex string, or `null` for the current default.
- DB-level guard: `CHECK (name_color ~ '^#[0-9a-fA-F]{6}$')` (null passes the
  check since `null ~ ...` is null/unknown, not false).

New migration: `supabase/migrations/0008_profile_name_color.sql`.

Update `lib/types.ts`:
- `profiles.Row.name_color: string | null`
- `profiles.Insert.name_color?: string | null`
- `profiles.Update.name_color?: string | null`

`null` means "use the existing default color" at every render site. This keeps
existing rows valid with no backfill.

## Modal UI (`components/ProfileEditModal.tsx`)

Add a "Name color" section directly under the Display name field:

- A **"Default" chip** that clears the selection to `null`.
- **~7 preset swatches** tuned for legibility on the dark surface
  (`olivia-bg #1b1b1d`, `olivia-surface #242427`, `olivia-raised #2f2f33`):
  coral `#ff8fa3`, amber `#f5c451`, lime `#8fe388`, sky `#6cc5ff`,
  violet `#c4a3ff`, teal `#5fe3c0`, orange `#ff9f6b`.
  (Exact hex values may be tuned during implementation; count stays ~7.)
- A **native `<input type="color">`** for choosing a specific color.
- The currently-selected swatch / Default chip is visually marked as active.

Behavior:
- New local state `color: string | null` initialized from `profile.name_color`.
- **Live preview**: the Display name input text and the initials preview render
  in the selected color as the user picks (fall back to default when `null`).
- Validate any custom value against `^#[0-9a-fA-F]{6}$`; the native picker only
  emits valid hex, so this mainly guards against bad state.
- Include `color` in the `dirty` calculation so Save enables when only the color
  changed: `dirty = avatar !== null || trimmed !== profile.display_name ||
  color !== profile.name_color`.
- Pass the color through the existing `onSave` callback.

## Save flow (`components/Dashboard.tsx`)

- Extend `onSave` signature to `(displayName, avatar, nameColor)` where
  `nameColor: string | null`, and update the `ProfileEditModal` prop type plus
  the call site (~L1051).
- Extend `saveProfile` (~L605) to accept `nameColor` and:
  - include `name_color: nameColor` in the optimistic `Profile` upsert,
  - include `name_color: nameColor` in the Supabase `.update(...)`.
- Pass `nameColor={currentProfile?.name_color ?? null}` (or equivalent) to the
  `Header` so the header name reflects the color.

## Render sites

Apply the color via inline style, keeping the existing class as the `null`
fallback so nothing changes for users who never pick a color:

```tsx
style={{ color: profile.name_color ?? undefined }}
```

Per site:
- **ProfileCard**: name `<p>` and the initials fallback `<div>`.
- **Header**: name element and initials fallback (new `nameColor` prop).
- **TbdList**: wrap the `raisedBy` name in a `<span>` carrying the raiser's
  `profiles[item.created_by]?.name_color ?? undefined`.
- **ProfileEditModal**: initials preview uses the in-progress `color` state.
- **ActivityLog** (see below).

### Activity log

The activity log currently colors name segments by a fixed scheme
(you = `olivia-pink`, others = `status-chill`). Decision: **custom colors
override this scheme, falling back to it when the named user has no color.**

To do this, the name segment must know which user it refers to:
- In `lib/activity.ts`, extend the `Segment` `name` variant to include
  `userId: string | null` (the actor or target user id; `null` when unknown,
  e.g. a deleted/absent actor). `renderActivity` already has `entry.actor_id`
  and `entry.target_user_id` available to populate it. `renderActivity` stays
  pure — it carries the id, not the color.
- In `components/ActivityLog.tsx`, build a `colorsById` lookup alongside the
  existing `namesById`, then for each name segment:
  - if the user has a `name_color`, render the name in that color via inline
    style;
  - otherwise fall back to the existing class (`text-olivia-pink` when
    `seg.isYou`, else `text-status-chill`).
  The `font-semibold` weight is preserved in all cases.

## Validation & safety

- Client: reject non-`^#[0-9a-fA-F]{6}$` values before saving.
- DB: `CHECK` constraint as above.
- Rendering as a React `style` object (not a raw style string) means values are
  set as DOM style properties; invalid values are ignored by the browser and
  there is no CSS-injection surface.

## Testing

- Update `lib/__tests__/activity.test.ts`: name segments now include
  `userId`; adjust the `toEqual({ kind: "name", value, isYou })` assertions to
  include the expected `userId` (or compare with `objectContaining` where the
  test only cares about value/isYou).
- Add cases asserting `userId` is the actor id for the actor segment and the
  target user id for the target segment.

## Out of scope / non-goals

- No readability enforcement on custom colors — users may pick a low-contrast
  color; that is their choice. (A future enhancement could warn on low
  contrast.)
- No coloring of notification bodies (plain-text OS strings).
- No per-context color overrides — one color per user, used everywhere.
