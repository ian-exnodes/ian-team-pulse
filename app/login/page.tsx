"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim();

type Mode = "signin" | "signup" | "reset";

const MIN_PASSWORD = 6;

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setNeedsConfirm(false);
    setPassword("");
  }

  function domainOk(addr: string) {
    if (!allowedDomain) return true;
    return addr.split("@")[1] === allowedDomain.toLowerCase();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsConfirm(false);

    const addr = email.trim().toLowerCase();
    if (!addr) return;
    const supabase = createClient();

    // --- Forgot password ---
    if (mode === "reset") {
      setBusy(true);
      await supabase.auth.resetPasswordForEmail(addr, {
        redirectTo: `${location.origin}/auth/reset`,
      });
      setBusy(false);
      // Always succeed-looking, so accounts can't be probed.
      setNotice(
        "If an account exists for that email, we sent a password reset link."
      );
      return;
    }

    if (!domainOk(addr)) {
      setError(`Sign-ups are restricted to @${allowedDomain} email addresses.`);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    // --- Create account ---
    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      setBusy(true);
      const { error: signUpError } = await supabase.auth.signUp({
        email: addr,
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setNotice(
        "Account created — check your email and click the link to confirm, then sign in."
      );
      setMode("signin");
      return;
    }

    // --- Sign in ---
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: addr,
      password,
    });
    setBusy(false);
    if (signInError) {
      if (/email not confirmed/i.test(signInError.message)) {
        setError("Please confirm your email first — check your inbox.");
        setNeedsConfirm(true);
      } else if (/invalid login credentials/i.test(signInError.message)) {
        setError("Wrong email or password.");
      } else {
        setError(signInError.message);
      }
      return;
    }
    // Full reload so the proxy re-evaluates with the new session cookies.
    window.location.assign("/");
  }

  async function resendConfirmation() {
    const addr = email.trim().toLowerCase();
    if (!addr) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email: addr });
    setBusy(false);
    setNeedsConfirm(false);
    setNotice("Confirmation email resent — check your inbox.");
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "reset"
        ? "Reset your password"
        : "Sign in";

  return (
    <main className="flex min-h-screen items-center justify-center bg-olivia-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-olivia-border bg-olivia-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-olivia-cream">
          Team Pulse<span className="text-olivia-pink">.</span>
        </h1>
        <p className="mt-1 text-sm text-olivia-muted">{title}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
            />
          )}

          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={allowedDomain ? `you@${allowedDomain}` : "you@example.com"}
            className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
          />

          {mode !== "reset" && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-olivia-pink px-3 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </button>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {needsConfirm && (
            <button
              type="button"
              onClick={resendConfirmation}
              className="text-sm text-olivia-pink underline-offset-2 hover:underline"
            >
              Resend confirmation email
            </button>
          )}
          {notice && (
            <p className="rounded-lg border border-olivia-pink/40 bg-olivia-pink/10 p-3 text-sm text-olivia-cream">
              {notice}
            </p>
          )}
        </form>

        <div className="mt-6 space-y-1 text-sm text-olivia-muted">
          {mode === "signin" && (
            <>
              <p>
                First time here?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="text-olivia-pink underline-offset-2 hover:underline"
                >
                  Create an account
                </button>
              </p>
              <p>
                <button
                  onClick={() => switchMode("reset")}
                  className="text-olivia-pink underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            </>
          )}
          {mode !== "signin" && (
            <p>
              <button
                onClick={() => switchMode("signin")}
                className="text-olivia-pink underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
