import type { DerivedStatus, Profile, Task } from "./types";

// Displayed status is derived, never stored:
// manual "off" always wins; else any in-progress task; else chill.
export function deriveStatus(
  profile: Pick<Profile, "manual_status">,
  tasks: Task[]
): DerivedStatus {
  if (profile.manual_status === "off") return "off";
  if (tasks.some((t) => t.status === "inprogress")) return "inprogress";
  return "chill";
}
