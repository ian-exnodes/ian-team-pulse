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
3. Paste and run [`supabase/migrations/0002_per_user_permissions.sql`](supabase/migrations/0002_per_user_permissions.sql).
   This tightens permissions: only you can change your own status and tasks;
   the shared Todolist/TBD stay editable by everyone.
4. (Optional but recommended for a first look) Paste and run
   [`supabase/seed.sql`](supabase/seed.sql) for 3 sample members with tasks,
   todos, and blockers.
   > The seed writes sample users into the `auth` schema, which is an
   > unsupported surface and may break on future Supabase versions. If it
   > errors, create 3 users under **Authentication → Add user** instead and
   > re-run only the tasks/team_items sections with those users' UUIDs.

Using the Supabase CLI instead? `supabase link --project-ref <ref>` then
`supabase db push` applies the migration.

## 3. Configure auth

1. **Authentication → Sign In / Up**: make sure the **Email** provider is
   enabled (it is by default; magic links need no password setup).
2. **Authentication → URL Configuration → Site URL**: set it to where the app
   runs — `http://localhost:3000` for development, your production URL when you
   deploy. **If you skip this, magic links will point at the wrong host.**
3. (Recommended) **Authentication → URL Configuration → Redirect URLs**: add
   `http://localhost:3000/auth/callback` (and the production equivalent later).

That's it — the app works with Supabase's **default** "Magic link or OTP"
email template out of the box (the sign-in link lands on `/auth/callback`,
or on the Site URL where the app forwards it automatically).

> **Email limits & templates.** New Supabase projects can't edit email
> templates and are rate-limited to a handful of emails per hour until you
> configure custom SMTP (Authentication → Emails → SMTP Settings, e.g. with
> Resend). That's fine for trying the app out. For production, set up SMTP
> and (optionally) point the Magic Link template at
> `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` —
> this also lets a link sent to your laptop be opened on your phone
> (the default template's link only works in the browser that requested it).

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

## Notifications

Click the bell in the header to enable browser notifications. While the tab
is in the background you'll be notified when a teammate finishes a task or
adds a team todo. Your own actions never notify you; the bell toggles mute
once permission is granted.

## How status works

A member's badge is derived, never stored:

1. They set themselves **Off** (gray) — manual override, always wins. Their
   tasks stay visible.
2. Otherwise, any in-progress task → **In Progress** (green).
3. Otherwise → **Chill** (blue).

"Done today" is a filter on `completed_at` in your browser's timezone — it
naturally resets at midnight, and yesterday's done tasks stay in the database.
