# Team Pulse

A live standup dashboard for a small team (5–10 people). The home screen is a
grid of profile cards — one per member — showing each person's derived status
(**Off** / **In Progress** / **Chill**), what they're working on, and what they
finished today. Shared **Team Todolist** and **TBD** (blockers) sections live in
the sidebar, and a **Report** button generates a copy-pasteable plain-text
summary of all current tasks. Everything updates in realtime for everyone.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Postgres, realtime, magic-link auth).

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project
   (free tier is fine). Pick any database password — you won't need it here.
2. Wait for the project to finish provisioning.

## 2. Run the migration and seed

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and run it. This creates the tables, triggers, row-level security, and
   realtime publication.
3. (Optional but recommended for a first look) Paste and run
   [`supabase/seed.sql`](supabase/seed.sql) for 3 sample members with tasks,
   todos, and blockers.
   > The seed writes sample users into the `auth` schema, which is an
   > unsupported surface and may break on future Supabase versions. If it
   > errors, create 3 users under **Authentication → Add user** instead and
   > re-run only the tasks/team_items sections with those users' UUIDs.

Using the Supabase CLI instead? `supabase link --project-ref <ref>` then
`supabase db push` applies the migration.

## 3. Configure auth

1. **Authentication → Sign In / Up → Email**: make sure the Email provider is
   enabled (magic links are on by default; no password setup needed).
2. **Authentication → Emails → Magic Link**: set the template's link to:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

3. **Authentication → URL Configuration → Site URL**: set it to where the app
   runs — `http://localhost:3000` for development, your production URL when you
   deploy. **If you skip this, magic links will point at the wrong host.**

## 4. Configure the app

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` key (or an `sb_publishable_...` key)

## 5. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your email, and
click the magic link. A profile is created for you automatically on first
sign-in.

## Restricting signups (optional)

By default **anyone can sign up**. To restrict signups to one email domain,
configure **both** halves together — they must match:

1. Client-side hint (friendly error on the login form) — in `.env.local`:

   ```
   NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=mycompany.com
   ```

2. Server-side enforcement (the real gate, a Postgres trigger) — in the SQL
   editor:

   ```sql
   update public.app_config set allowed_email_domain = 'mycompany.com';
   ```

Setting only the env var means no actual enforcement; setting only the database
value means blocked users see a generic error instead of a friendly one. To
re-open signups, clear both (`set allowed_email_domain = null`).

## Tests

```bash
npm test
```

Unit tests cover the pure logic: status derivation, the "done today" local-day
filter, relative times, and the exact report format.

## How status works

A member's badge is derived, never stored:

1. They set themselves **Off** (gray) — manual override, always wins. Their
   tasks stay visible.
2. Otherwise, any in-progress task → **In Progress** (green).
3. Otherwise → **Chill** (blue).

"Done today" is a filter on `completed_at` in your browser's timezone — it
naturally resets at midnight, and yesterday's done tasks stay in the database.
