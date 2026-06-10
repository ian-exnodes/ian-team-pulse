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
    });
    setSending(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Team Pulse</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with a magic link sent to your email.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            Check your email — we sent a sign-in link to{" "}
            <span className="font-medium">{email.trim()}</span>.
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
