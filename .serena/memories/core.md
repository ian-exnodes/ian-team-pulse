# Team Pulse — core map

Live standup dashboard for a 5–10 person team. Profile-card grid with derived member status, shared Team Todolist + TBD (blockers), plain-text report generator, optional Jira import. Everything realtime via Supabase.

## Source map
- `app/page.tsx` — only real page; server component, fetches profiles/tasks/team_items/activity_log in parallel, renders `Dashboard`. Auth routes under `app/auth/*` (callback, confirm, reset, signout, error), `app/login/`. Jira OAuth + import API under `app/api/jira/*`.
- `components/` — flat dir of React components, almost all `"use client"`; `Dashboard.tsx` is the realtime/state hub, now an orchestrator over the extracted `lib/` logic (the realtime subscription effect, refs, and notification dedup set deliberately stay in the component). `StandupPrompt` (browser-local once-a-day "what are you working on?" nudge) and `TrendsModal` (numeric per-person completion stats, opened from the header) are the newest additions.
- `lib/` — pure logic with colocated unit tests in `lib/__tests__/`. Domain helpers: `status`, `dates`, `report`, `dnd`, `jira`, `activity`, `avatar`, `notifications`. Logic extracted out of `Dashboard` so it's testable: `store` (the realtime reducer + `Store`/`Action` types + `toMap`), `views` (derived sort/group/filter), `notify-rules` (which teammate change warrants a notification), `optimistic` (shared upsert→write→guarded-rollback helper), `trends` (per-person completion counts), `standup` (the once-a-day nudge rule). Supabase client factories in `lib/supabase/` (`client`, `server`, `admin`, `proxy`). Hand-written DB types in `lib/types.ts`.
- `proxy.ts` (repo root) — Next.js 16 replacement for `middleware.ts`: exports `proxy(request)`, delegates to `updateSession` in `lib/supabase/proxy.ts`.
- `supabase/migrations/` — append-only numbered SQL (`0001`…`0008`), applied MANUALLY in the Supabase SQL editor (or `supabase db push`); never auto-applied by the app.
- `ARCHITECTURE.md` (repo root) — one-page human-facing map of layers, realtime/optimistic flow, and the "pure logic in `lib/`" split. Linked from `README.md`. Keep it in sync when the layering changes.
- `docs/superpowers/` — design specs and implementation plans for past features.
- `supabase/migrations/0008_profile_name_color.sql` — adds `name_color text` (nullable `#rrggbb`) to `profiles`. Applied in branch `feature/profile-name-color`; must be run manually before the branch ships.

## Project-wide invariants
- **Next.js 16 breaks training-data assumptions** (AGENTS.md): read the relevant guide in `node_modules/next/dist/docs/` (folders `01-app`, `02-pages`, `03-architecture`) before writing Next-related code. Example: middleware is now `proxy.ts`/`proxy()`.
- Member status is **derived, never stored**: manual `off` wins → else any `inprogress` task → else `chill` (`lib/status.ts`). "Done today" filters `completed_at` in the browser's local day.
- DB is RLS-locked. `activity_log` is written ONLY by SECURITY DEFINER triggers (actor = `auth.uid()`); clients have select-only. Tasks are collaborative (anyone may assign/reassign); profile status + quick-add are owner-only; team-item attribution is immutable.
- Server-only env: `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` — never `NEXT_PUBLIC_`. `NEXT_PUBLIC_*` values bake into the bundle at build time. Jira UI is gated by `NEXT_PUBLIC_JIRA_ENABLED=true`.
- Server pages re-check auth themselves (`supabase.auth.getUser()` + redirect) — never trust the proxy alone.

## Further memories
- Memory routing table: `mem:INDEX`
- Languages, frameworks, version pins: `mem:tech_stack`
- Dev/test/lint commands and Supabase CLI usage: `mem:suggested_commands`
- Code style, component/lib patterns, Tailwind theme, migration conventions: `mem:conventions`
- Module boundaries, data flow, realtime/optimistic model: `mem:architecture`
- Supabase client factories, Jira OAuth, auth flow, RLS interaction: `mem:api`
- What to run before declaring a task done: `mem:task_completion`
