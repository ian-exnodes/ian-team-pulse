# Tech stack

- Node **24.x** (pinned via `engines`; Next 16 requires ≥ 20.9). Package manager: **npm** (`package-lock.json`).
- **Next.js 16.2.9** App Router + **React 19.2.4** + **TypeScript 5 strict**. Path alias `@/*` → repo root. Version has breaking changes vs training data — consult `node_modules/next/dist/docs/` first (see `mem:core`).
- **Tailwind CSS v4** via `@tailwindcss/postcss`: no `tailwind.config.*`; theme tokens declared with `@theme` in `app/globals.css`.
- **Supabase**: `@supabase/supabase-js` ^2 + `@supabase/ssr` ^0.12 (Postgres, realtime subscriptions, email+password auth, storage bucket for avatars). Client factories in `lib/supabase/`.
- **@dnd-kit/core** for drag-and-drop task assignment (pure helpers in `lib/dnd.ts`).
- **Vitest 4** for unit tests (`lib/__tests__/`, pure logic only).
- **ESLint 9** flat config (`eslint.config.mjs`) + `eslint-config-next` 16.2.9.
- Deploy target: Vercel + hosted Supabase; env in `.env.local` (template `.env.example`).
