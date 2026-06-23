// Decides whether to nudge the current member for a standup update. The nudge
// asks "what are you working on today?" and is shown at most once per workday.
// Pure so the heuristic can be unit-tested and tuned in one place.

import { doneWindowStart } from "./dates";
import type { Profile, Task } from "./types";

export function needsStandupPrompt(params: {
  profile: Profile | undefined;
  myInProgressTasks: Task[];
  // ISO timestamp of when the prompt was last shown/answered, or null.
  lastPromptedAt: string | null;
  now: Date;
}): boolean {
  const { profile, myInProgressTasks, lastPromptedAt, now } = params;

  // No profile yet (still loading) - nothing to prompt.
  if (!profile) return false;
  // Members who marked themselves Off aren't expected to report.
  if (profile.manual_status === "off") return false;
  // Already declared something to work on - no nudge needed.
  if (myInProgressTasks.length > 0) return false;
  // Shown already within the current workday (same 9pm-boundary window the
  // rest of the app treats as "today") - don't nag again.
  if (
    lastPromptedAt &&
    new Date(lastPromptedAt).getTime() >= doneWindowStart(now).getTime()
  ) {
    return false;
  }
  return true;
}
