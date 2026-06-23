// Pure derived-view helpers for the Dashboard. Each takes the materialized
// rows (Object.values of the store maps) and returns the shape the UI renders,
// so the ordering/grouping rules can be unit-tested without React.

import type { Profile, Task, TeamItem } from "./types";

// Your own card always leads; everyone else follows alphabetically.
export function sortProfilesByUser(
  profiles: Profile[],
  currentUserId: string
): Profile[] {
  return [...profiles].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.display_name.localeCompare(b.display_name);
  });
}

export function groupTasksByAssignee(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const t of tasks) {
    (map[t.assignee_id] ??= []).push(t);
  }
  return map;
}

// Todos read oldest-first (a working queue); blockers read newest-first
// (most recent pain on top).
export function filterTeamItems(
  items: TeamItem[],
  type: TeamItem["type"]
): TeamItem[] {
  return items
    .filter((i) => i.type === type)
    .sort((a, b) =>
      type === "todo"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)
    );
}
