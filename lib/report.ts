import { isToday } from "./dates";
import type { Task } from "./types";

// Plain-text report of all current tasks: everything in progress plus
// everything completed today. One line per task:
//   {link} {title} ( {status} )   or   {title} ( {status} )
export function buildReport(tasks: Task[], now: Date): string {
  const inProgress = tasks
    .filter((t) => t.status === "inprogress")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const doneToday = tasks
    .filter((t) => t.status === "done" && isToday(t.completed_at, now))
    .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));

  const lines = [...inProgress, ...doneToday].map((t) =>
    t.link ? `${t.link} ${t.title} ( ${t.status} )` : `${t.title} ( ${t.status} )`
  );

  return lines.length ? lines.join("\n") + "\n" : "";
}
