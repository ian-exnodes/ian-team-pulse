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

export function relativeTime(iso: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
