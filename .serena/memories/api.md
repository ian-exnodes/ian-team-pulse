# API Memory

## Client setup

- HTTP client: **Supabase JS** (`@supabase/supabase-js` ^2) — not Axios; no custom HTTP client
- Client factories in `lib/supabase/`:
  - `client.ts` — browser client (singleton, used in `"use client"` components)
  - `server.ts` — server component client (per-request cookies)
  - `admin.ts` — service-role client for server-only privileged ops
  - `proxy.ts` — session refresh helper, used by `proxy.ts` at repo root
- Base URL source: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (bundle-time bake-in)
- Auth mechanism: Supabase email+password; session stored in cookies via `@supabase/ssr`

## Conventions

- Client components import `createClient` from `@/lib/supabase/client`
- Server components/routes import `createClient` from `@/lib/supabase/server`
- Privileged server ops (admin tasks) use `createAdminClient` from `@/lib/supabase/admin`
- Queries return `{ data, error }` — check `error` before using `data`
- RLS is always on; a 0-row update without an error is an RLS denial — `optimisticUpdate` guards for this via `ifCurrentIs`

## Jira integration

- OAuth flow: `app/api/jira/connect/` → Atlassian auth → `app/api/jira/callback/` (exchanges code, stores tokens)
- Disconnect: `app/api/jira/disconnect/`
- Import issues: `app/api/jira/issues/` (fetches and maps Jira issues to tasks)
- Status check: `app/api/jira/status/` (is Jira connected?)
- Pure Jira helpers (status mapping, field extraction): `lib/jira.ts`
- UI gating: `NEXT_PUBLIC_JIRA_ENABLED=true` must be set; component `JiraImportModal.tsx` checks this
- Jira secrets (`JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`) are server-only — never `NEXT_PUBLIC_`
- Import searches **all** Jira statuses (not just workflow ones) — fixed in commit `9518fac`

## Auth/session flow

- Login: `app/login/` page → Supabase `signInWithPassword`
- Session refresh: `proxy.ts` (repo root) calls `updateSession` on every request
- Auth callback (email confirm/OAuth): `app/auth/callback/`
- Password reset: `app/auth/reset/`
- Signout: `app/auth/signout/`
- Server pages always re-check `supabase.auth.getUser()` and redirect if unauthenticated — never trust cookie alone

## Realtime

- Supabase realtime subscriptions in `Dashboard.tsx` (postgres_changes on `profiles`, `tasks`, `team_items`, `activity_log`)
- Realtime events dispatch to `storeReducer` in `lib/store.ts`

## Known risks

- Avatar storage: Supabase Storage bucket; URLs come from `profile.avatar_url` — no signed URLs currently
- `activity_log` is select-only for clients; all writes are trigger-driven (SECURITY DEFINER)
- Jira token storage: tokens stored server-side (in Supabase or env); do not expose to client
