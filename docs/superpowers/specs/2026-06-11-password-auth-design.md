# Email + password auth — design

## Context

Magic-link-on-every-login hammers Supabase's built-in email service (a few
emails/hour), so routine logins fail with "email rate limit exceeded". Switch
to: **one email at signup (confirmation), password for every login after**,
plus **forgot-password** for recovery. User-approved: password-at-signup
(Option A) + include reset flow.

## Flow

- **Sign in** (default `/login` mode): email + password →
  `signInWithPassword` → `/`. No email.
- **Create account** (`/login` signup mode): email + password + display name →
  `signUp({ password, options:{ data:{ display_name }, emailRedirectTo:
  origin + "/auth/callback" } })`. Supabase sends one confirmation email; the
  link → `/auth/callback` (existing PKCE route) → confirmed + logged in → `/`.
  Domain pre-check (`NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`) still applies.
- **Forgot password** (`/login` reset mode): email →
  `resetPasswordForEmail(email, { redirectTo: origin + "/auth/reset" })` →
  "check your email". Always shows success (no account enumeration).
- **`/auth/reset`** (new client page): recovery link lands here with `?code=`;
  exchange it for a session, show "set a new password" form →
  `updateUser({ password })` → `/`. Proxy already skips `/auth/*`, so the code
  isn't hijacked to `/auth/callback`.

## Why this works on the built-in email service

Only signup-confirm and password-reset send email — both rare. Day-to-day
logins send nothing, so the rate limit is effectively never hit. Custom SMTP
remains the production-grade fix but is no longer required for normal use.

## Files

- **Rework** `app/login/page.tsx` → one client component, `mode` state
  `signin | signup | reset`; friendly error mapping ("Invalid login
  credentials" → wrong email/password; "Email not confirmed" → resend link via
  `auth.resend({ type:'signup' })`); password min length 6.
- **New** `app/auth/reset/page.tsx` → exchange `?code`, set-new-password form.
- **Keep** `/auth/callback` (signup confirm), `/auth/confirm`, `/auth/signout`,
  `/auth/error`. `handle_new_user` trigger already reads `display_name` from
  user metadata — no DB change.
- **README** auth section + add `http://localhost:3000/auth/reset` to the
  Supabase Redirect URLs allowlist; keep "Confirm email" ON.

## Existing passwordless accounts

Accounts created earlier via magic link (incl. the owner's) have no password —
they use **Forgot password** once to set one. Seed users already have
`password123`.

## Verification

- Gates: lint, tsc, vitest, build.
- REST smoke: `grant_type=password` for a seed user already works (proven in
  RLS tests) → password auth is live on the project.
- Manual: sign up → confirm email → land in app; log out; log in with password
  (no email); forgot-password → reset link → set password → logged in.
