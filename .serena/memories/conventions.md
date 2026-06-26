# Code conventions

## TypeScript / structure
- Strict TS, no `any`-tolerance; 2-space indent, double-quoted strings, named exports (`export function X`), no default exports outside `app/` route files.
- DB types are HAND-WRITTEN in `lib/types.ts`, deliberately shaped like `supabase gen types typescript` output (so a generated file can drop in later). When a migration changes schema, update `lib/types.ts` to match. Use the row aliases `Profile`, `Task`, `TeamItem`.
- Pure, testable logic goes in `lib/*.ts` with a colocated test in `lib/__tests__/<name>.test.ts`; components stay thin. Tests cover pure logic only — no component/integration tests (no jsdom/testing-library in deps). When `Dashboard` grows logic worth testing (reducer, derived views, notification rules, an optimistic-mutation pattern, a feature heuristic), extract it to a `lib/` module and test it there rather than reaching for a DOM. The realtime subscription effect, refs, and dedup set stay in the component by design — they're load-bearing and not worth the extraction risk.
- Optimistic mutations that update one existing row use the shared `optimisticUpdate` helper (`lib/optimistic.ts`): apply optimistic row → run the DB write → guarded rollback (`ifCurrentIs`) on error or RLS-denied 0-row writes. Multi-row/insert-shaped mutations stay hand-rolled.
- Components live flat in `components/`, one component per file, file named after the component; almost all are `"use client"`. Server-side code (data fetch, redirects) lives in `app/` route files only.
- Imports use the `@/` alias (e.g. `@/lib/types`, `@/components/Dashboard`).

## Comments
- Liberal "why"-comments at file/block level explaining design intent (e.g. "Defense in depth — never trust the proxy alone."). Match this density; don't strip them.

## Styling (Tailwind v4)
- Custom "GMK Olivia" dark palette + status colors defined via `@theme` in `app/globals.css`: `olivia-bg/surface/raised/border/cream/muted/pink/pink-deep`, `status-active/chill/warn`, plus `animate-status-glow`. Use these tokens, never raw hex/standard Tailwind colors, so the theme stays coherent.
- Reusable CSS lives in `app/globals.css` (e.g. `.olivia-scroll` themed scrollbar).

## SQL migrations
- Append-only `supabase/migrations/NNNN_description.sql`, next free number; start with a banner comment stating purpose and "run after NNNN-1".
- Patterns in force: RLS on every table; client grants narrowed with `revoke`/`grant`; SECURITY DEFINER trigger functions with `set search_path = ''` and fully-qualified `public.*` names; `auth.uid()` captures the actor; tables added to the `supabase_realtime` publication when the UI subscribes; `detail` columns snapshot titles so log rows survive deletions.
