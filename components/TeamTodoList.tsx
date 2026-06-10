"use client";

import type { TeamItem } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";
import { QuickAddTask } from "./QuickAddTask";

// Shared section: outlined (vs. the solid member cards) with a pink
// square marker so it reads as "team-wide", not another person.
export function TeamTodoList({
  items,
  onAdd,
  onToggle,
}: {
  items: TeamItem[];
  onAdd: (content: string, link: string) => void;
  onToggle: (item: TeamItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-olivia-border bg-olivia-bg/40 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
        <span className="inline-block h-2 w-2 rounded-xs bg-olivia-pink" />
        Team Todolist
      </h2>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-olivia-muted/70">Nothing yet</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggle(item)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-olivia-pink"
              />
              <span
                className={
                  item.done
                    ? "text-olivia-muted line-through"
                    : "text-olivia-cream"
                }
              >
                {item.content}
              </span>
              {item.link && <LinkIcon href={item.link} />}
            </li>
          ))}
        </ul>
      )}
      <QuickAddTask placeholder="Add a team todo…" onAdd={onAdd} />
    </section>
  );
}
