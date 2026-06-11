# Team Pulse

A live standup dashboard for a small team (5–10 people). The home screen is a
grid of profile cards — one per member — showing each person's derived status
(**Off** / **In Progress** / **Chill**), what they're working on, and what they
finished today. Shared **Team Todolist** and **TBD** (blockers) sections live in
the sidebar, and a **Report** button generates a copy-pasteable plain-text
summary of all current tasks. Everything updates in realtime for everyone.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Postgres, realtime, email + password auth).

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
4. Paste and run [`supabase/migrations/0003_pin_team_item_attribution.sql`](supabase/migrations/0003_pin_team_item_attribution.sql).
   Shared items stay editable, but "raised by" attribution can no longer be
   rewritten after the fact.
5. Paste and run [`supabase/migrations/0004_open_task_assignment.sql`](supabase/migrations/0004_open_task_assignment.sql).
   Makes tasks collaborative so work can be assigned/reassigned by dragging
   (profile status stays personal).
6. (Optional but recommended for a first look) Paste and run
   [`supabase/seed.sql`](supabase/seed.sql) for 3 sample members with tasks,
   todos, and blockers.
   > The seed writes sample users into the `auth` schema, which is an
   > unsupported surface and may break on future Supabase versions. If it
   > errors, create 3 users under **Authentication → Add user** instead and
   > re-run only the tasks/team_items sections with those users' UUIDs.

Using the Supabase CLI instead? `supabase link --project-ref <ref>` then
`supabase db push` applies the migration.

## 3. Configure auth

Auth is **email + password**: you sign up once (one confirmation email),
then log in with your password — so routine logins send no email.

1. **Authentication → Sign In / Up → Email**: make sure the **Email** provider
   is enabled and **Confirm email** is ON (both are the defaults). This is what
   sends the one-time signup confirmation.
2. **Authentication → URL Configuration → Site URL**: set it to where the app
   runs — `http://localhost:3000` for development, your production URL when you
   deploy. **If you skip this, email links point at the wrong host.**
3. **Authentication → URL Configuration → Redirect URLs**: add both
   `http://localhost:3000/auth/callback` (signup confirmation) and
   `http://localhost:3000/auth/reset` (password reset), plus the production
   equivalents when you deploy.

Sign up → click the confirmation link (lands on `/auth/callback`) → you're in.
Forgot your password? The login page's reset link emails you a link to
`/auth/reset` to set a new one.

> **Email limits & SMTP.** New Supabase projects use a built-in email service
> rate-limited to a handful of emails per hour. Because only signup and
> password-reset send email now (not everyday logins), you'll rarely hit it.
> For a real team, configure custom SMTP anyway (Authentication → Emails →
> SMTP Settings, e.g. with Resend's free tier) to lift the limit and unlock
> editable templates.

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

Open [http://localhost:3000](http://localhost:3000), click **Create an
account**, set an email + password + name, then click the confirmation link in
your inbox. A profile is created for you automatically on first sign-in; after
that you log in with your password.

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

## Assigning work (drag and drop)

Grab the grip handle on any in-progress task or Team Todolist item and drop it
onto a member's card:

- **task → another card** reassigns it to that person
- **team todo → a card** turns it into that person's task and removes it from
  the shared list

Tasks are collaborative (anyone can assign/reassign); only you can set your own
Off status or quick-add to your own card.

## Notifications

Click the bell in the header to enable browser notifications. While the tab
is in the background you'll be notified when a teammate finishes a task, adds a
team todo, or **assigns a task to you**. Your own actions never notify you; the
bell toggles mute once permission is granted.

## How status works

A member's badge is derived, never stored:

1. They set themselves **Off** (gray) — manual override, always wins. Their
   tasks stay visible.
2. Otherwise, any in-progress task → **In Progress** (green).
3. Otherwise → **Chill** (blue).

"Done today" is a filter on `completed_at` in your browser's timezone — it
naturally resets at midnight, and yesterday's done tasks stay in the database.
