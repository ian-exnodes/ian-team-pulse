"use client";

import type { Task } from "@/lib/types";
import { LinkIcon } from "./LinkIcon";

export function TaskList({
  tasks,
  variant,
  onMarkDone,
}: {
  tasks: Task[];
  variant: "working" | "doneToday";
  onMarkDone?: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400">Nothing here</p>;
  }

  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2 text-sm">
          {variant === "working" ? (
            <button
              onClick={() => onMarkDone?.(task)}
              title="Mark done"
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 hover:border-green-500 hover:bg-green-100"
            />
          ) : (
            <span className="mt-0.5 text-green-600">✓</span>
          )}
          <span
            className={
              variant === "doneToday"
                ? "text-slate-400 line-through"
                : "text-slate-700"
            }
          >
            {task.title}
          </span>
          {task.link && <LinkIcon href={task.link} />}
        </li>
      ))}
    </ul>
  );
}
