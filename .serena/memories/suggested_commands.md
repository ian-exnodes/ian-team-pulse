# Suggested commands

Run from the project root.

- `npm run dev` — dev server at http://localhost:3000 (needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `npm run build` — production build (also the full type-check gate)
- `npm start` — serve the production build
- `npm run lint` — ESLint 9 (flat config)
- `npm test` — `vitest run` (single pass); `npx vitest` for watch mode
- `npx tsc --noEmit` — type-check without building (no dedicated script)

## Database
- Normal flow: paste `supabase/migrations/NNNN_*.sql` into the Supabase dashboard SQL editor, in numeric order.
- CLI alternative: `supabase link --project-ref <ref>` then `supabase db push`.
- New migrations are NEVER applied automatically — tell the user to run them.

## Darwin notes
- BSD userland: `sed -i` needs an explicit suffix arg (`sed -i '' …`), no GNU `grep -P`; prefer `rg`/`find` over GNU-specific flags.
