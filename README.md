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

There's no sample data — teammates just register, and each gets a profile card
automatically on first sign-in.

Using the Supabase CLI instead? `supabase link --project-ref <ref>` then
`supabase db push` applies the migrations.

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

## Deploying to production (Vercel + Supabase)

The app is a standard Next.js project and deploys to Vercel with no extra
config. Node is pinned to 24.x via `engines` in `package.json` (Next.js 16
requires Node ≥ 20.9).

### 1. Deploy to Vercel

1. Push to GitHub (already done if you cloned this), then in
   [vercel.com](https://vercel.com) **Add New → Project** and import the repo.
   Vercel auto-detects Next.js — leave Build/Install/Output at the defaults.
2. Under **Environment Variables**, add (Production scope):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` (only if restricting signups)

   `NEXT_PUBLIC_*` vars are baked into the browser bundle **at build time** —
   changing one later needs a redeploy.
3. Deploy. You'll get a URL like `https://your-app.vercel.app`.

### 2. Point Supabase at the production URL

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL** → `https://your-app.vercel.app` (used to build the links in
  confirmation / password-reset emails).
- **Redirect URLs** → add `https://your-app.vercel.app/auth/callback` and
  `https://your-app.vercel.app/auth/reset`. Keep the `localhost:3000` entries
  for local dev. For Vercel preview deploys, optionally add a wildcard like
  `https://*-<your-team>.vercel.app/**`.

### 3. Custom SMTP so emails aren't rate-limited

The built-in email service caps at a handful of emails/hour — fine for testing,
not for a real team. Point Supabase at [Resend](https://resend.com) (free tier:
100/day, 3,000/month):

1. In Resend: verify a sending **domain** (production) — or use
   `onboarding@resend.dev` for testing only — and create an API key with Sending
   permission.
2. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = your
     Resend API key (`re_…`).
   - Sender email = an address on your verified domain; set a sender name.
3. Supabase → **Authentication → Rate Limits**: raise "Rate limit for sending
   emails" (custom SMTP defaults to 30/hour) to match your team.

With password auth, only signup confirmations and password resets send email,
so even modest limits are rarely hit — but custom SMTP makes it reliable and
lets you edit the email templates.

## Assigning work (drag and drop)

Grab the grip handle on any in-progress task or Team Todolist item and drop it
onto a member's card:

- **task → another card** reassigns it to that person
- **team todo → a card** turns it into that person's task and removes it from
  the shared list

Tasks are collaborative (anyone can assign/reassign); only you can set your own
Off status or quick-add to your own card.

## Importing from Jira (optional)

Each teammate can connect their own Jira account and pull their open issues
onto their card. The issue summary becomes the task title and the Jira link
goes in the task's link — no retyping.

> **Off by default.** The Jira button is hidden unless
> `NEXT_PUBLIC_JIRA_ENABLED=true` is set (so the feature stays dormant in
> production until you opt in). Set it in `.env.local` to develop locally.
> Note: importing a client's Jira data into this app may need their sign-off
> and their Atlassian org may restrict third-party OAuth apps — confirm before
> enabling it for shared/client boards.

**Setup (one-time), once you enable it:**

1. **Register an OAuth 2.0 (3LO) app** at
   [developer.atlassian.com](https://developer.atlassian.com) → your app →
   **Authorization → OAuth 2.0 (3LO)**. Add the API scopes `read:jira-work`,
   `read:me`, and `offline_access`. Set **Callback URLs** to
   `http://localhost:3000/api/jira/callback` and
   `https://<your-app>.vercel.app/api/jira/callback`.
2. Copy the app's **Client ID** and **Secret** into `.env.local` (and Vercel):
   `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`. Add your Supabase **service-role**
   key as `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). All three are
   **server-only** — never prefix them `NEXT_PUBLIC_`.
3. Run [`supabase/migrations/0005_jira_connections.sql`](supabase/migrations/0005_jira_connections.sql)
   in the SQL editor (the table that stores each user's tokens, locked to
   server-only access).

Then click **Jira** in the header → **Connect Jira** → authorize → pick issues
→ **Import**. Tokens stay server-side; only the issue list reaches the browser.
Import is one-directional (Jira → board); board edits don't change Jira.

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
