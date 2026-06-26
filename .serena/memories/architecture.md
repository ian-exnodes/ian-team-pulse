# Architecture Memory

## Project shape

- App type: Next.js 16 App Router, single-page dashboard, no multi-route UI
- Main entry: `app/page.tsx` — server component; parallel-fetches profiles/tasks/team_items/activity_log; renders `<Dashboard>`
- Auth routes: `app/auth/*` (callback, confirm, reset, signout, error), `app/login/`
- Jira OAuth + import API: `app/api/jira/{callback,connect,disconnect,issues,status}/`
- Client components: `components/` (flat, one file per component, almost all `"use client"`)
- Pure logic + tests: `lib/` + `lib/__tests__/`
- DB types: `lib/types.ts` (hand-written, mirrors `supabase gen types`)
- Supabase client factories: `lib/supabase/{client,server,admin,proxy}.ts`
- Middleware replacement: `proxy.ts` at repo root exports `proxy(request)` → Next.js 16 pattern

## Module boundaries

- `app/` owns server-side data fetch, redirects, and API routes — nothing from `components/` should import from `app/`
- `lib/` is pure: no React, no Supabase calls, no side effects; testable with Vitest alone
- `components/` may import from `lib/` and `lib/supabase/client`; never the other direction
- `Dashboard.tsx` is the realtime/state hub: owns the Supabase realtime subscription effect, refs, and notification dedup Set — do not extract these into lib (load-bearing, not worth the risk)

## Data flow

- **Initial load**: server component (`app/page.tsx`) → parallel Supabase queries → hydrates `<Dashboard>` with initial arrays
- **Realtime updates**: `Dashboard.tsx` subscribes to `profiles`, `tasks`, `team_items`, `activity_log` via Supabase realtime; dispatches to `lib/store.ts` reducer (`storeReducer`) → derived views via `lib/views.ts`
- **Optimistic mutations**: single-row updates use `lib/optimistic.ts::optimisticUpdate` (apply → DB write → guarded rollback on error/RLS 0-row); multi-row/insert mutations are hand-rolled
- **Status**: member status is derived in `lib/status.ts`, never stored in DB; `off` wins → any `inprogress` task → `chill`
- **Activity log**: written ONLY by SECURITY DEFINER triggers; clients have select-only

## Shared abstractions

- `lib/store.ts` — realtime reducer (`storeReducer`) + `Store`/`Action` types + `toMap`; used by Dashboard
- `lib/views.ts` — sort/group/filter derived from store state
- `lib/optimistic.ts` — `optimisticUpdate(store, dispatch, key, optimisticRow, write, ifCurrentIs)`; used by 5+ single-row mutations in Dashboard
- `lib/status.ts` — `deriveStatus(profile, tasks)` — the single authority for member status
- `lib/notify-rules.ts` — which teammate state change warrants a push notification
- `lib/standup.ts` — once-a-day nudge rule (`needsStandupPrompt`)
- `lib/trends.ts` — `summarizeCompletions` for TrendsModal
- `lib/activity.ts`, `lib/dates.ts`, `lib/report.ts`, `lib/dnd.ts`, `lib/jira.ts`, `lib/notifications.ts`, `lib/avatar.ts` — domain helpers

## Key schema facts (as of migration 0008)

- `profiles`: `id`, `name`, `avatar_url`, `name_color` (nullable #rrggbb hex, constraint `profiles_name_color_format`), `updated_at`
- `tasks`: collaborative — anyone may assign/reassign; `status` field drives member status derivation
- `team_items`: attribution immutable after creation
- `activity_log`: insert-only via triggers; `detail` columns snapshot titles so log rows survive deletions
- Migrations: `supabase/migrations/0001`…`0008`, append-only, applied MANUALLY

## Known risks

- Realtime subscription effect and dedup Set stay in `Dashboard.tsx` by design — extracting them has been rejected; don't reopen without strong reason
- `name_color` is nullable; all display sites must handle null (fall back to app default color, currently `olivia-cream` `#d4c9a8`)
- Next.js 16 breaks common training-data assumptions — read `node_modules/next/dist/docs/` before touching routing, middleware, or server/client boundaries
- Server pages re-check auth themselves (`supabase.auth.getUser()` + redirect) — never trust the proxy alone
