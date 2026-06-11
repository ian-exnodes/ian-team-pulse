# Activity log — design

## Context

The team wants a shared, timestamped feed of all member activity on the board
(status changes, tasks added/assigned/done, team todos, TBD blockers), shown
full-width below the cards grid + sidebar. Names are highlighted; the current
user renders as **"You"** in the pink accent so their own actions stand out.

## Recording — database triggers

Postgres triggers write an `activity_log` row whenever the underlying data
actually changes, capturing the actor via `auth.uid()` (every mutation goes
through each user's authenticated client, incl. Jira imports). This records all
activity exactly once per real change, independent of the app's optimistic UI,
and can't be forgotten by a future code path.

## Schema — `0007_activity_log.sql`

`activity_log(id, actor_id FK profiles, type text, target_user_id FK profiles
null, entity_id uuid null, detail text null, meta jsonb null, created_at)`.
`detail` snapshots the task title / item content so it survives deletion.
Index on `created_at desc`. RLS: authenticated **select only** (shared feed);
no client writes — only the SECURITY DEFINER trigger functions insert. Added to
the `supabase_realtime` publication.

Triggers (all SECURITY DEFINER, search_path=''):
- `tasks` AFTER INSERT/UPDATE → `task_added` (target=assignee when ≠ actor),
  `task_assigned` (on assignee change), `task_done`/`task_reopened` (on status
  change).
- `profiles` AFTER UPDATE OF manual_status → `status_off`/`status_back`.
- `team_items` AFTER INSERT/UPDATE/DELETE → `todo_added`/`tbd_raised`,
  `todo_checked`/`tbd_resolved` (done→true, or tbd→todo type move),
  `todo_deleted`/`tbd_dismissed`.

## Types → sentences (`lib/activity.ts`)

Pure `renderActivity(entry, currentUserId, namesById)` returns styled
`Segment[]` (`text` | `name{value,isYou}` | `detail`). Names resolve from the
profiles already in the store. Actor at sentence start → "You"/name; target
mid-sentence → "you"/name. Examples: "**You** added a new task: *Fix bug*",
"**Henry** assigned *Fix bug* to **you**", "**Chi** checked off *Book room*",
"**You** raised a blocker: *Staging down*", "**Henry** set themselves Off".

## Display — `components/ActivityLog.tsx`

Full-width section below `<main>`. Seeded with the recent ~50 entries fetched in
`app/page.tsx` (new `initialActivity` prop), then realtime `INSERT` on
`activity_log` prepends new rows (deduped by id, capped ~100). Each row: the
rendered sentence (member names cream/semibold, **You** in pink) + relative
time (absolute on hover). Empty state: "No activity yet."

## Wiring

- `app/page.tsx`: fetch `activity_log` ordered `created_at desc` limit 50.
- `components/Dashboard.tsx`: `activity` useState from `initialActivity`; add an
  `activity_log` INSERT binding to the existing realtime channel; refetch recent
  50 inside `hydrate` (reconnect backfill); render `<ActivityLog>` after `</main>`.
- `lib/types.ts`: add `activity_log` Row.

## Out of scope

Profile-edit events; pagination beyond recent 50 (load-more later); editing or
deleting log entries.

## Verification

- Unit tests: `renderActivity` — you-substitution and each type's sentence.
- REST: `activity_log` is read-only to clients (insert as a user → denied).
- Gates: tsc, eslint, vitest, build.
- Manual (two users): each action appears live with correct names + "You" in
  pink and correct timestamps.
