"use client";

import type { TeamItem } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";
import { QuickAddTask } from "./QuickAddTask";

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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Team Todolist</h2>
      {items.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">Nothing yet</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggle(item)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-slate-700"
              />
              <span
                className={
                  item.done ? "text-slate-400 line-through" : "text-slate-700"
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
