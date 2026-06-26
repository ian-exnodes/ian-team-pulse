# Task completion checklist

When a coding task is done, run from the project root:

1. `npm run lint` — must pass clean
2. `npm test` — vitest unit suite must pass; add/update tests in `lib/__tests__/` when pure logic in `lib/` changed
3. `npx tsc --noEmit` — quick type-check (or `npm run build` for the full gate when routes/config changed)

Additionally:
- Schema changed? Add a new numbered file in `supabase/migrations/` AND update `lib/types.ts` to match; remind the user to run the migration manually (SQL editor or `supabase db push`) — see `mem:suggested_commands`.
- There is no formatter script (no Prettier config) — match the existing style by hand.
