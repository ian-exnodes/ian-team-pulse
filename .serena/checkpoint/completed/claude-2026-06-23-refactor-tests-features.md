# Checkpoint: claude — 2026-06-23 — Dashboard split, tests, standup + trends

## What was done
- **Code split (A):** extracted pure logic out of `Dashboard.tsx` into `lib/`:
  `store.ts` (reducer + Store/Action/toMap), `views.ts` (sort/group/filter),
  `notify-rules.ts` (notification classifiers), `optimistic.ts` (shared
  upsert→write→guarded-rollback helper used by 5 single-row mutations).
  Realtime effect/refs/dedup set deliberately left in Dashboard.
- **Tests (B):** new `lib/__tests__/` suites for store, views, notify-rules,
  optimistic, standup, trends. 62 → 109 tests.
- **Standup nudge (C):** `lib/standup.ts` (`needsStandupPrompt`, 9pm-boundary,
  once/day) + `components/StandupPrompt.tsx` (localStorage timestamp, quick-add).
  Wired in Dashboard after NotifPrompt.
- **Trends (D):** `lib/trends.ts` (`summarizeCompletions`, same ranges as report)
  + `components/TrendsModal.tsx` + Header "Trends" button. Reuses the report's
  lazy week-task fetch (generalized to a shared `weekNeeded` flag).
- **Docs (E):** refreshed Serena `core.md` + `conventions.md`; added
  `ARCHITECTURE.md` (linked from README); fixed README "done today" 9pm note.
- **Skipped A5** (TeamBoard/DashboardModals extraction) — low value / high churn,
  realtime effect stays in Dashboard regardless.

## Files changed
- New: `lib/{store,views,notify-rules,optimistic,standup,trends}.ts`,
  `lib/__tests__/{store,views,notify-rules,optimistic,standup,trends}.test.ts`,
  `components/{StandupPrompt,TrendsModal}.tsx`, `ARCHITECTURE.md`
- Edited: `components/Dashboard.tsx`, `components/Header.tsx`, `README.md`,
  `.serena/memories/{core,conventions}.md`

## Current state
- Working. No behavior change in the refactor (pure extraction).

## Verified
- `npx tsc --noEmit` clean · `npx eslint components/ lib/` clean
- `npm test` → 109 passed (13 files) · `npm run build` → success
- NOT manually browser-tested (two-tab realtime smoke, standup banner, trends
  modal) — recommended before merge.

## Next steps
- Manual smoke test: realtime two-tab, standup prompt appears once/day + adds
  task, trends counts reconcile with cards/report.
- Optional: A5 component extraction if Dashboard JSX grows further.

## Blockers / Risks
- Standup heuristic ("no in-progress task") may misfire mid-day; tunable in one
  pure fn. Trends week range relies on the shared weekTasks fetch (cleared on
  modal close).
