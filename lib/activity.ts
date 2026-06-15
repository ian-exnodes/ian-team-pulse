// Activity log: row shape + a pure renderer that turns a row into styled
// sentence segments. Names resolve from the profiles already in the store;
// the current user becomes "You". The renderer is unit-tested.

export type ActivityType =
  | "task_added"
  | "task_assigned"
  | "task_done"
  | "task_reopened"
  | "status_off"
  | "status_back"
  | "todo_added"
  | "todo_checked"
  | "todo_deleted"
  | "tbd_raised"
  | "tbd_resolved"
  | "tbd_dismissed";

export interface ActivityRow {
  id: string;
  actor_id: string | null;
  type: ActivityType;
  target_user_id: string | null;
  entity_id: string | null;
  detail: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export type Segment =
  | { kind: "text"; value: string }
  | { kind: "name"; value: string; isYou: boolean; userId: string | null }
  | { kind: "detail"; value: string };

const t = (value: string): Segment => ({ kind: "text", value });
const d = (value: string): Segment => ({ kind: "detail", value });

export function renderActivity(
  entry: ActivityRow,
  currentUserId: string,
  namesById: Record<string, string>
): Segment[] {
  const actorIsYou = entry.actor_id === currentUserId;
  const actorName = entry.actor_id
    ? (namesById[entry.actor_id] ?? "Someone")
    : "Someone";
  // Actor leads the sentence → capitalised "You".
  const actor: Segment = {
    kind: "name",
    value: actorIsYou ? "You" : actorName,
    isYou: actorIsYou,
    userId: entry.actor_id,
  };

  const targetIsYou = entry.target_user_id === currentUserId;
  const targetName = entry.target_user_id
    ? (namesById[entry.target_user_id] ?? "someone")
    : "someone";
  const target: Segment = {
    kind: "name",
    value: targetIsYou ? "you" : targetName,
    isYou: targetIsYou,
    userId: entry.target_user_id,
  };

  const detail = entry.detail ?? "";

  switch (entry.type) {
    case "task_added":
      return entry.target_user_id
        ? [actor, t(" added a task for "), target, t(": "), d(detail)]
        : [actor, t(" added a new task: "), d(detail)];
    case "task_assigned":
      return [actor, t(" assigned "), d(detail), t(" to "), target];
    // The colored chip already states the status, so these no longer repeat
    // it as a trailing word.
    case "task_done":
      return [actor, t(" completed "), d(detail)];
    case "task_reopened":
      return [actor, t(" reopened "), d(detail)];
    case "status_off":
      return [actor, t(" stepped away")];
    case "status_back":
      return [actor, t(" returned")];
    case "todo_added":
      return [actor, t(" added a team todo: "), d(detail)];
    case "todo_checked":
      return [actor, t(" checked off "), d(detail)];
    case "todo_deleted":
      return [actor, t(" removed a team todo: "), d(detail)];
    case "tbd_raised":
      return [actor, t(" raised a blocker: "), d(detail)];
    case "tbd_resolved":
      return [actor, t(" resolved a blocker: "), d(detail)];
    case "tbd_dismissed":
      return [actor, t(" dismissed a blocker: "), d(detail)];
  }
}
