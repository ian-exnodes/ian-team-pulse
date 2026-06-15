"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  renderActivity,
  type ActivityRow,
  type ActivityType,
} from "@/lib/activity";
import { relativeTime } from "@/lib/dates";
import type { Profile } from "@/lib/types";

// Colored chip per action type — the "status" highlight.
const CHIP: Record<ActivityType, { label: string; cls: string }> = {
  task_added: { label: "Task", cls: "bg-status-chill/15 text-status-chill" },
  task_assigned: { label: "Assigned", cls: "bg-olivia-pink/15 text-olivia-pink" },
  task_done: { label: "Done", cls: "bg-status-active/15 text-status-active" },
  task_reopened: { label: "Reopened", cls: "bg-status-warn/15 text-status-warn" },
  status_off: { label: "Off", cls: "bg-olivia-muted/20 text-olivia-muted" },
  status_back: { label: "Back", cls: "bg-status-active/15 text-status-active" },
  todo_added: { label: "Todo", cls: "bg-status-chill/15 text-status-chill" },
  todo_checked: { label: "Todo done", cls: "bg-status-active/15 text-status-active" },
  todo_deleted: { label: "Todo removed", cls: "bg-olivia-muted/20 text-olivia-muted" },
  tbd_raised: { label: "Blocker", cls: "bg-status-warn/15 text-status-warn" },
  tbd_resolved: { label: "Resolved", cls: "bg-status-active/15 text-status-active" },
  tbd_dismissed: { label: "Dismissed", cls: "bg-olivia-muted/20 text-olivia-muted" },
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

// Chat-style feed below the board, framed as a single chatbox card. Entries
// run oldest → newest (newest at the bottom, like a chat) inside a fixed-
// height scroll area that auto-scrolls to the bottom when a new log arrives.
// Each entry is the actor's avatar + a message bubble; member names are
// highlighted (you = pink, others = cyan) and a colored chip marks the action.
export function ActivityLog({
  activity,
  currentUserId,
  profiles,
  now,
}: {
  activity: ActivityRow[];
  currentUserId: string;
  profiles: Record<string, Profile>;
  now: Date | null;
}) {
  const namesById = useMemo(
    () =>
      Object.fromEntries(
        Object.values(profiles).map((p) => [p.id, p.display_name])
      ),
    [profiles]
  );

  const colorsById = useMemo(
    () =>
      Object.fromEntries(
        Object.values(profiles).map((p) => [p.id, p.name_color])
      ),
    [profiles]
  );

  // `activity` arrives newest-first; a chat reads oldest-first.
  const ordered = useMemo(() => [...activity].reverse(), [activity]);

  const scrollRef = useRef<HTMLUListElement>(null);
  const hasScrolledRef = useRef(false);
  const newestId = activity[0]?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Jump instantly on first paint, glide on subsequent new entries.
    el.scrollTo({
      top: el.scrollHeight,
      behavior: hasScrolledRef.current ? "smooth" : "instant",
    });
    hasScrolledRef.current = true;
  }, [newestId]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12">
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
        <span className="inline-block h-2 w-2 rounded-full bg-status-active" />
        Activity Logs
      </h2>

      {activity.length === 0 ? (
        <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-olivia-border bg-olivia-surface">
          <p className="text-sm text-olivia-muted/70">No activity yet.</p>
        </div>
      ) : (
        <ul
          ref={scrollRef}
          className="olivia-scroll h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-olivia-border bg-olivia-surface p-4"
        >
          {ordered.map((entry) => {
            const actor = entry.actor_id ? profiles[entry.actor_id] : undefined;
            const chip = CHIP[entry.type];
            return (
              <li key={entry.id} className="flex gap-2.5">
                {actor?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={actor.avatar_url}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olivia-raised text-[10px] font-semibold text-olivia-pink">
                    {initials(actor?.display_name ?? "?")}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="inline-block max-w-full rounded-2xl rounded-tl-sm border border-olivia-border bg-olivia-raised px-3 py-2">
                    <p className="text-sm leading-snug text-olivia-muted">
                      <span
                        className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip.cls}`}
                      >
                        {chip.label}
                      </span>
                      {renderActivity(entry, currentUserId, namesById).map(
                        (seg, i) => {
                          if (seg.kind === "name") {
                            const custom = seg.userId
                              ? colorsById[seg.userId] ?? null
                              : null;
                            return (
                              <span
                                key={i}
                                className={
                                  custom
                                    ? "font-semibold"
                                    : seg.isYou
                                      ? "font-semibold text-olivia-pink"
                                      : "font-semibold text-status-chill"
                                }
                                style={custom ? { color: custom } : undefined}
                              >
                                {seg.value}
                              </span>
                            );
                          }
                          if (seg.kind === "detail") {
                            return (
                              <span key={i} className="text-olivia-cream">
                                {seg.value}
                              </span>
                            );
                          }
                          return <span key={i}>{seg.value}</span>;
                        }
                      )}
                    </p>
                  </div>
                  {now && (
                    <time
                      dateTime={entry.created_at}
                      title={new Date(entry.created_at).toLocaleString()}
                      className="mt-1 block text-[11px] text-olivia-muted"
                    >
                      {relativeTime(entry.created_at, now)}
                    </time>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
