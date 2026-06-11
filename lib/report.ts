import { isDoneToday, WEEK_MS } from "./dates";
import type { Task } from "./types";

export type ReportRange = "day" | "week";

// Plain-text report of current tasks: everything in progress plus
// everything completed in the chosen range - "day" (since the last 9pm
// boundary) or "week" (last 7 days). One line per task:
//   {link} {title} ( {status} )   or   {title} ( {status} )
export function buildReport(
  tasks: Task[],
  now: Date,
  range: ReportRange = "day"
): string {
  const inRange = (iso: string | null) =>
    range === "week"
      ? iso !== null && now.getTime() - new Date(iso).getTime() <= WEEK_MS
      : isDoneToday(iso, now);

  const inProgress = tasks
    .filter((t) => t.status === "inprogress")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const done = tasks
    .filter((t) => t.status === "done" && inRange(t.completed_at))
    .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));

  const lines = [...inProgress, ...done].map((t) =>
    t.link ? `${t.link} ${t.title} ( ${t.status} )` : `${t.title} ( ${t.status} )`
  );

  return lines.length ? lines.join("\n") + "\n" : "";
}
