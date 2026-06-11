"use client";

import type { TeamItem } from "@/lib/types";
import { DragHandle } from "./DragHandle";
import { LinkIcon } from "./LinkIcon";
import { QuickAddTask } from "./QuickAddTask";

// Shared section: outlined (vs. the solid member cards) with a pink
// square marker so it reads as "team-wide", not another person.
export function TeamTodoList({
  items,
  onAdd,
  onDelete,
}: {
  items: TeamItem[];
  onAdd: (content: string, link: string) => void;
  onDelete: (item: TeamItem) => void;
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
            <li key={item.id} className="flex items-center gap-2 text-sm">
              {/* Not-done todos can be dragged onto a member to assign. */}
              {!item.done && (
                <DragHandle
                  dragId={`todo:${item.id}`}
                  item={{ kind: "todo", id: item.id }}
                  label={item.content}
                />
              )}
              <span
                className={
                  item.done
                    ? "flex-1 text-olivia-muted line-through"
                    : "flex-1 text-olivia-cream"
                }
              >
                {item.content}
              </span>
              {item.link && <LinkIcon href={item.link} />}
              <button
                onClick={() => onDelete(item)}
                title="Delete"
                aria-label={`Delete ${item.content}`}
                className="shrink-0 text-olivia-muted/60 hover:text-olivia-pink"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M2.5 4h11M6.5 4V2.75A.75.75 0 0 1 7.25 2h1.5a.75.75 0 0 1 .75.75V4M5 4l.5 9.25a1 1 0 0 0 1 .75h3a1 1 0 0 0 1-.75L11 4M6.75 7v4M9.25 7v4" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <QuickAddTask placeholder="Add a team todo…" onAdd={onAdd} />
    </section>
  );
}
