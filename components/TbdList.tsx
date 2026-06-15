"use client";

import { relativeTime } from "@/lib/dates";
import type { Profile, TeamItem } from "@/lib/types";
import { ItemTitle } from "./ItemTitle";
import { LinkIcon } from "./LinkIcon";
import { QuickAddTask } from "./QuickAddTask";

// Blockers section: pink-tinted outline + flag marker so it stands apart
// from both the member cards and the Team Todolist.
export function TbdList({
  items,
  profiles,
  now,
  onAdd,
  onToggle,
  onDismiss,
}: {
  items: TeamItem[];
  profiles: Record<string, Profile>;
  now: Date | null;
  onAdd: (content: string, link: string) => void;
  onToggle: (item: TeamItem) => void;
  onDismiss: (item: TeamItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-olivia-pink/40 bg-olivia-pink/5 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
        <span aria-hidden>⚑</span>
        TBD — Blockers
      </h2>
      <p className="mb-3 text-xs text-olivia-muted">
        Stuck, missing docs, waiting on decisions
      </p>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-olivia-muted/70">No blockers 🎉</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {items.map((item) => {
            const raisedBy = item.created_by
              ? profiles[item.created_by]?.display_name ?? "someone"
              : "someone";
            const raisedByColor = item.created_by
              ? profiles[item.created_by]?.name_color ?? undefined
              : undefined;
            return (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggle(item)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-olivia-pink"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ItemTitle
                      text={item.content}
                      link={item.link}
                      className={
                        item.done
                          ? "text-olivia-muted line-through"
                          : "text-olivia-cream"
                      }
                    />
                    {item.link && <LinkIcon href={item.link} />}
                  </div>
                  <p className="mt-0.5 text-xs text-olivia-muted">
                    raised by{" "}
                    <span
                      className="text-olivia-pink/90"
                      style={{ color: raisedByColor }}
                    >
                      {raisedBy}
                    </span>
                    {now && <> · {relativeTime(item.created_at, now)}</>}
                  </p>
                </div>
                {item.done && (
                  <button
                    onClick={() => onDismiss(item)}
                    title="Dismiss"
                    className="shrink-0 text-olivia-muted/60 hover:text-olivia-pink"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <QuickAddTask placeholder="Raise a blocker…" onAdd={onAdd} />
    </section>
  );
}
