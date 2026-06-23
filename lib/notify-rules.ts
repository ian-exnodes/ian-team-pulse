// Pure "what does this change mean for me?" rules for realtime notifications.
// The effect wiring, dedup set, visibility gate, and showNotification calls
// stay in Dashboard; this module only decides which (if any) notification a
// task/team-item change warrants, so the rules can be unit-tested.

import type { Task, TaskStatus, TeamItem } from "./types";

export type TaskNotification = "done" | "assigned" | null;

// Live event path (a postgres_changes INSERT/UPDATE). `prevStatus`/`prevAssignee`
// are the last-known values before this event. The two outcomes are mutually
// exclusive: "done" requires the task be assigned to someone else, "assigned"
// requires it be assigned to you.
export function classifyTaskChange(params: {
  eventType: "INSERT" | "UPDATE";
  task: Task;
  prevStatus: TaskStatus | undefined;
  prevAssignee: string | undefined;
  currentUserId: string;
}): TaskNotification {
  const { eventType, task, prevStatus, prevAssignee, currentUserId } = params;

  // A teammate completed a task assigned to someone else.
  if (
    eventType === "UPDATE" &&
    prevStatus !== undefined &&
    prevStatus !== "done" &&
    task.status === "done" &&
    task.assignee_id !== currentUserId
  ) {
    return "done";
  }

  // Work landed on you (reassigned to you, or a todo converted onto you).
  if (task.assignee_id === currentUserId) {
    const wasMine = eventType === "UPDATE" && prevAssignee === currentUserId;
    // created_by only suppresses your OWN insert echo (quick-add or a todo you
    // converted to yourself). On reassignment it must not suppress: a task you
    // originally created can be assigned back to you by someone else.
    const iCreatedIt =
      eventType === "INSERT" && task.created_by === currentUserId;
    if (!wasMine && !iCreatedIt) return "assigned";
  }

  return null;
}

// Snapshot-diff path: transitions that happened while the socket was down and
// never arrived as events. No INSERT echo here (rows come from a fetch), so no
// created_by suppression is needed - you can't act on your own behalf offline.
export function classifyTaskSnapshot(params: {
  task: Task;
  prevStatus: TaskStatus | undefined;
  prevAssignee: string | undefined;
  currentUserId: string;
}): TaskNotification {
  const { task, prevStatus, prevAssignee, currentUserId } = params;

  if (
    prevStatus !== "done" &&
    task.status === "done" &&
    task.assignee_id !== currentUserId
  ) {
    return "done";
  }

  if (task.assignee_id === currentUserId && prevAssignee !== currentUserId) {
    return "assigned";
  }

  return null;
}

// A new shared todo raised by a teammate is worth a heads-up; your own isn't.
export function shouldNotifyTeamTodo(
  item: TeamItem,
  currentUserId: string
): boolean {
  return item.type === "todo" && item.created_by !== currentUserId;
}
