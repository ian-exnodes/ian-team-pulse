"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (
      allowedDomain &&
      trimmed.split("@")[1] !== allowedDomain.toLowerCase()
    ) {
      setError(`Sign-ups are restricted to @${allowedDomain} email addresses.`);
      return;
    }

    setSending(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      // Used by the default email template's ConfirmationURL (when the URL is
      // allowlisted in the dashboard); ignored by a custom token_hash template.
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setSending(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-olivia-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-olivia-border bg-olivia-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-olivia-cream">
          Team Pulse<span className="text-olivia-pink">.</span>
        </h1>
        <p className="mt-1 text-sm text-olivia-muted">
          Sign in with a magic link sent to your email.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-olivia-pink/40 bg-olivia-pink/10 p-4 text-sm text-olivia-cream">
            Check your email — we sent a sign-in link to{" "}
            <span className="font-medium text-olivia-pink">{email.trim()}</span>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                allowedDomain ? `you@${allowedDomain}` : "you@example.com"
              }
              className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-lg bg-olivia-pink px-3 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-300">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
