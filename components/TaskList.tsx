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
  // Present only on your own card - others' tasks are read-only.
  onMarkDone?: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-olivia-muted/70">Nothing here</p>;
  }

  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2 text-sm">
          {variant === "working" ? (
            onMarkDone ? (
              <button
                onClick={() => onMarkDone(task)}
                title="Mark done"
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-olivia-muted hover:border-olivia-pink hover:bg-olivia-pink/20"
              />
            ) : (
              <span
                aria-hidden
                className="mx-1.25 mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-olivia-pink/60"
              />
            )
          ) : (
            <span className="mt-0.5 text-olivia-pink">✓</span>
          )}
          <span
            className={
              variant === "doneToday"
                ? "text-olivia-muted line-through"
                : "text-olivia-cream"
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
