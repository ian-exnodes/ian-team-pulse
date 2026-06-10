"use client";

import { relativeTime } from "@/lib/dates";
import type { Profile, TeamItem } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";
import { QuickAddTask } from "./QuickAddTask";

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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">TBD</h2>
      <p className="mb-3 text-xs text-slate-400">
        Blockers — stuck, missing docs, waiting on decisions
      </p>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">No blockers 🎉</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {items.map((item) => {
            const raisedBy = item.created_by
              ? profiles[item.created_by]?.display_name ?? "someone"
              : "someone";
            return (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggle(item)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={
                      item.done
                        ? "text-slate-400 line-through"
                        : "text-slate-700"
                    }
                  >
                    {item.content}
                  </span>{" "}
                  {item.link && <LinkIcon href={item.link} />}
                  <p className="mt-0.5 text-xs text-slate-400">
                    raised by {raisedBy}
                    {now && <> · {relativeTime(item.created_at, now)}</>}
                  </p>
                </div>
                {item.done && (
                  <button
                    onClick={() => onDismiss(item)}
                    title="Dismiss"
                    className="shrink-0 text-slate-300 hover:text-slate-600"
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
