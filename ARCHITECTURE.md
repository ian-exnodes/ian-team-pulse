# Architecture

A map of how Team Pulse is put together, for humans. Setup and deployment live
in [README.md](README.md); this file is the "how it works" companion. Keep it in
sync when the layering changes.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
Supabase (Postgres + RLS + Realtime + email/password auth). Tests: Vitest
(pure-logic units only — no jsdom/testing-library).

## Layers

```
app/page.tsx  (server component)
  ├─ auth check (supabase.auth.getUser) → redirect to /login if no session
  ├─ initial parallel fetch: profiles, tasks (~48h), team_items, activity_log
  └─ renders ↓

components/Dashboard.tsx  ("use client" — the realtime/state hub & orchestrator)
  ├─ useReducer(reducer, …)            → lib/store.ts        (normalized store)
  ├─ realtime channel + hydrate effect → STAYS here (load-bearing, see below)
  ├─ optimistic mutations              → lib/optimistic.ts   (shared helper)
  ├─ derived views (useMemo)           → lib/views.ts        (sort/group/filter)
  ├─ notification decisions            → lib/notify-rules.ts (pure classifiers)
  └─ renders child components ↓

components/*  (presentational, props-down / events-up)
  Header · ProfileCard · TaskList · TeamTodoList · TbdList · ActivityLog
  ReportModal · TrendsModal · ProfileEditModal · JiraImportModal
  NotifPrompt · StandupPrompt · Toast
```

## State & realtime flow

1. **SSR seed.** `app/page.tsx` fetches a fresh snapshot and passes it as
   `initial*` props. The store only holds in-progress tasks plus ~48h of
   completed ones (`recentTaskCutoffIso`) — enough for the cards and today's
   report; the week views fetch wider on demand.
2. **Normalized store.** `lib/store.ts` is a pure reducer over
   `{ profiles, tasks, teamItems, connection }`, each table keyed by id.
   Actions: `hydrate` (wholesale replace on every (re)join), `upsert`/`remove`
   (realtime deltas + optimistic edits), `rollback` (guarded — see below),
   `connection`.
3. **One realtime channel**, three table bindings, upsert-by-id. On `SUBSCRIBED`
   it re-hydrates to backfill anything missed; events that arrive mid-fetch are
   buffered and replayed so nothing is lost.
4. **Optimistic mutations.** Every edit applies to the store first, then writes
   to Supabase. The single-row update path goes through `optimisticUpdate`
   (`lib/optimistic.ts`): apply → write → on error **or an RLS-denied 0-row
   write**, dispatch a `rollback`. The rollback is **guarded by `ifCurrentIs`**:
   it only restores the old row if the store still holds the exact optimistic
   object, so a fresher realtime row that arrived in between is never clobbered.

## The pure-logic-in-`lib` split (and why)

Components stay thin; anything worth testing is a pure function in `lib/*.ts`
with a colocated test in `lib/__tests__/`. That's why the reducer, derived
views, notification rules, the optimistic-update helper, and the two new
feature heuristics (`trends`, `standup`) all live in `lib/` rather than inside
`Dashboard`. No DOM is needed to test them.

**Deliberate boundary:** the realtime subscription effect, its refs, and the
notification dedup set **stay in `Dashboard.tsx`**. They're tightly coupled to
React's lifecycle and load-bearing; extracting them would add risk without
buying testability. The *decisions* they make are extracted (`notify-rules.ts`);
the *wiring* is not.

## Derived status

A member's badge is computed, never stored (`lib/status.ts`): manual **Off**
wins → else any in-progress task → **In Progress** → else **Chill**. "Done
today" filters `completed_at` against a 9pm-local workday boundary
(`lib/dates.ts`); rows are kept in the DB so weekly views still see them.

## Features built on this

- **Standup nudge** (`StandupPrompt` + `lib/standup.ts`) — a browser-local,
  once-a-workday prompt shown when you're not Off and have nothing in progress.
  No backend or cron; the "last prompted" timestamp lives in `localStorage`.
- **Trends** (`TrendsModal` + `lib/trends.ts`) — per-person completion counts
  for today / the last 7 days, opened from the header. Uses the *same* ranges as
  the report so the numbers reconcile; the week range reuses the report's lazy
  week-task fetch.

## Security model (brief)

RLS on every table. `activity_log` is written only by `SECURITY DEFINER`
triggers (clients are select-only). Tasks are collaborative (anyone may
assign/reassign); profile status and quick-add are owner-only. Jira tokens and
the service-role key are server-only and never `NEXT_PUBLIC_`. See
`supabase/migrations/` (`0001`…`0008`, applied manually).
