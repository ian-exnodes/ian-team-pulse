"use client";

import type { Task } from "@/lib/types";
import { DragHandle } from "./DragHandle";
import { ItemTitle } from "./ItemTitle";
import { LinkIcon } from "./LinkIcon";

export function TaskList({
  tasks,
  variant,
  onMarkDone,
  onReopen,
}: {
  tasks: Task[];
  variant: "working" | "doneToday";
  // Present only on your own card - others' tasks are read-only.
  onMarkDone?: (task: Task) => void;
  onReopen?: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-olivia-muted/70">Nothing here</p>;
  }

  return (
    <ul className="space-y-1.5">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-2 text-sm">
          {variant === "working" ? (
            <>
              {/* Any in-progress task can be dragged onto another card. */}
              <DragHandle
                dragId={`task:${task.id}`}
                item={{ kind: "task", id: task.id, assigneeId: task.assignee_id }}
                label={task.title}
              />
              {onMarkDone ? (
                <button
                  onClick={() => onMarkDone(task)}
                  title="Mark done"
                  className="h-4 w-4 shrink-0 rounded-full border-2 border-olivia-muted hover:border-olivia-pink hover:bg-olivia-pink/20"
                />
              ) : (
                <span
                  aria-hidden
                  className="mx-1.25 h-1.5 w-1.5 shrink-0 rounded-full bg-olivia-pink/60"
                />
              )}
            </>
          ) : onReopen ? (
            <button
              onClick={() => onReopen(task)}
              title="Reopen task"
              className="group/done flex h-4 w-4 shrink-0 items-center justify-center text-status-active hover:text-status-warn"
            >
              <span className="group-hover/done:hidden">✓</span>
              <span className="hidden group-hover/done:inline">↩</span>
            </button>
          ) : (
            <span className="text-status-active">✓</span>
          )}
          <ItemTitle
            text={task.title}
            link={task.link}
            className={
              variant === "doneToday"
                ? "text-olivia-muted line-through"
                : "text-olivia-cream"
            }
          />
          {task.link && <LinkIcon href={task.link} />}
        </li>
      ))}
    </ul>
  );
}
