"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;

type Status = "checking" | "ready" | "invalid" | "saving";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  // Establish the recovery session from the emailed link, then show the form.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const supabase = createClient();
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setStatus("invalid");
          return;
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setStatus(session ? "ready" : "invalid");
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-olivia-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-olivia-border bg-olivia-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-olivia-cream">
          Team Pulse<span className="text-olivia-pink">.</span>
        </h1>

        {status === "checking" && (
          <p className="mt-4 text-sm text-olivia-muted">Verifying your link…</p>
        )}

        {status === "invalid" && (
          <>
            <p className="mt-2 text-sm text-olivia-muted">
              This reset link is invalid, expired, or was opened in a different
              browser.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
            >
              Request a new link
            </Link>
          </>
        )}

        {(status === "ready" || status === "saving") && (
          <>
            <p className="mt-1 text-sm text-olivia-muted">Choose a new password.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-3 py-2 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
              />
              <button
                type="submit"
                disabled={status === "saving"}
                className="w-full rounded-lg bg-olivia-pink px-3 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
              >
                {status === "saving" ? "Saving…" : "Set new password"}
              </button>
              {error && <p className="text-sm text-red-300">{error}</p>}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
