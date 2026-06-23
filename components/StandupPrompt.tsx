"use client";

import { useState } from "react";
import { useSyncExternalStore } from "react";
import { needsStandupPrompt } from "@/lib/standup";
import type { Profile, Task } from "@/lib/types";

const PROMPTED_KEY = "team-pulse:standup-prompted";

// External store for the "last prompted" timestamp, mirroring NotifPrompt's
// dismiss flag - reading it needs no setState-in-effect and stays SSR-safe.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getLastPromptedAt(): string | null {
  return localStorage.getItem(PROMPTED_KEY);
}

function recordPrompted() {
  localStorage.setItem(PROMPTED_KEY, new Date().toISOString());
  listeners.forEach((l) => l());
}

// Once-a-workday nudge for the current member to declare what they're working
// on. Shows only when they're not Off, have no in-progress task, and haven't
// been prompted yet today (9pm-boundary "today"). Submitting creates the task
// in one step; "Not now" hushes it until the next workday.
export function StandupPrompt({
  profile,
  myInProgressTasks,
  now,
  onAdd,
}: {
  profile: Profile | undefined;
  myInProgressTasks: Task[];
  now: Date | null;
  onAdd: (title: string, link: string) => void;
}) {
  const lastPromptedAt = useSyncExternalStore(
    subscribe,
    getLastPromptedAt,
    () => null // server: render nothing (the `now` guard hides it until mount)
  );
  const [title, setTitle] = useState("");

  if (!now) return null;
  if (!needsStandupPrompt({ profile, myInProgressTasks, lastPromptedAt, now })) {
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, "");
    setTitle("");
    recordPrompted();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-olivia-pink/40 bg-olivia-pink/10 px-4 py-3"
      >
        <p className="text-sm text-olivia-cream">
          👋 What are you working on today?
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add your first task…"
          aria-label="What are you working on today?"
          className="min-w-0 flex-1 rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-olivia-pink px-3 py-1.5 text-sm font-semibold text-olivia-bg hover:bg-olivia-pink-deep"
          >
            Add
          </button>
          <button
            type="button"
            onClick={recordPrompted}
            className="rounded-lg px-3 py-1.5 text-sm text-olivia-muted hover:text-olivia-cream"
          >
            Not now
          </button>
        </div>
      </form>
    </div>
  );
}
