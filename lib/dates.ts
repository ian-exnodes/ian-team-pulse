// "Today" is always the viewer's local-timezone calendar day.

// The dashboard only ever shows in-progress tasks and tasks completed
// "today", so fetches are bounded to this window.
export const TASK_WINDOW_MS = 48 * 60 * 60 * 1000;

export function recentTaskCutoffIso(): string {
  return new Date(Date.now() - TASK_WINDOW_MS).toISOString();
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  return sameLocalDay(new Date(iso), now);
}

// The workday ends at 9pm local: at 21:00 every card's "Done today" list
// clears. Rows are kept in the database (weekly reports need them) - only
// the display window moves.
export const DAY_END_HOUR = 21;

// Most recent 9pm boundary: yesterday 21:00 before 9pm, today 21:00 after.
export function doneWindowStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(DAY_END_HOUR, 0, 0, 0);
  if (now.getHours() < DAY_END_HOUR) start.setDate(start.getDate() - 1);
  return start;
}

export function isDoneToday(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() >= doneWindowStart(now).getTime();
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weekCutoffIso(now: Date): string {
  return new Date(now.getTime() - WEEK_MS).toISOString();
}

export function relativeTime(iso: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
