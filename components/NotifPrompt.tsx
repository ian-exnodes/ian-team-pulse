"use client";

import { useSyncExternalStore } from "react";

const DISMISS_KEY = "team-pulse:notif-prompt-dismissed";

// Tiny external store for the one-time-dismiss flag, so reading it needs no
// setState-in-effect and stays SSR-safe (server snapshot = dismissed).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function isDismissed() {
  return localStorage.getItem(DISMISS_KEY) === "1";
}

function dismissForever() {
  localStorage.setItem(DISMISS_KEY, "1");
  listeners.forEach((l) => l());
}

// One-time banner inviting the user to enable browser notifications. Shows
// only when permission hasn't been decided and the user hasn't dismissed it.
// Requesting permission needs a user gesture, so it happens on the click.
export function NotifPrompt({
  show,
  onEnable,
}: {
  show: boolean;
  onEnable: () => void;
}) {
  const dismissed = useSyncExternalStore(
    subscribe,
    isDismissed,
    () => true // server: render nothing
  );

  if (!show || dismissed) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-active/40 bg-status-active/10 px-4 py-3">
        <p className="text-sm text-olivia-cream">
          🔔 Turn on notifications to hear when a teammate finishes a task, adds
          a team todo, or assigns work to you.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              onEnable();
              dismissForever();
            }}
            className="rounded-lg bg-status-active px-3 py-1.5 text-sm font-semibold text-olivia-bg hover:opacity-90"
          >
            Enable
          </button>
          <button
            onClick={dismissForever}
            className="rounded-lg px-3 py-1.5 text-sm text-olivia-muted hover:text-olivia-cream"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
