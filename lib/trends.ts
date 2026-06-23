// History/Trends aggregation: how many tasks each person completed in a range.
// Uses the SAME windows as buildReport (isDoneToday for "day", a 7-day window
// for "week") so the numbers reconcile with the report and the cards.

import { isDoneToday, WEEK_MS } from "./dates";
import type { ReportRange } from "./report";
import type { Profile, Task } from "./types";

export type CompletionStat = { profileId: string; name: string; count: number };
export type CompletionSummary = { perPerson: CompletionStat[]; total: number };

export function summarizeCompletions(
  tasks: Task[],
  profiles: Profile[],
  now: Date,
  range: ReportRange
): CompletionSummary {
  const inRange = (iso: string | null) =>
    range === "week"
      ? iso !== null && now.getTime() - new Date(iso).getTime() <= WEEK_MS
      : isDoneToday(iso, now);

  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "done" && inRange(t.completed_at)) {
      counts.set(t.assignee_id, (counts.get(t.assignee_id) ?? 0) + 1);
    }
  }

  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));
  const perPerson: CompletionStat[] = [...counts.entries()]
    .map(([profileId, count]) => ({
      profileId,
      name: nameById.get(profileId) ?? "Unknown",
      count,
    }))
    // Most productive first; ties broken by name for stable ordering.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const total = perPerson.reduce((sum, p) => sum + p.count, 0);
  return { perPerson, total };
}
