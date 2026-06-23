import { describe, expect, it } from "vitest";
import { summarizeCompletions } from "../trends";
import type { Profile, Task } from "../types";

const NOW = new Date(2026, 5, 10, 17, 0); // June 10, 5pm local

function isoAt(hour: number, day = 10): string {
  return new Date(2026, 5, day, hour, 0).toISOString();
}

function profile(over: Partial<Profile>): Profile {
  return {
    id: "p1",
    display_name: "Ada",
    avatar_url: null,
    name_color: null,
    manual_status: null,
    created_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

function task(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: "A task",
    link: null,
    status: "done",
    assignee_id: "p1",
    created_by: "p1",
    completed_at: isoAt(15),
    created_at: isoAt(8),
    updated_at: isoAt(15),
    ...over,
  };
}

const PROFILES = [
  profile({ id: "p1", display_name: "Ada" }),
  profile({ id: "p2", display_name: "Bo" }),
];

describe("summarizeCompletions", () => {
  it("counts done tasks per person for the day range, ranked by count", () => {
    const tasks = [
      task({ assignee_id: "p1", completed_at: isoAt(10) }),
      task({ assignee_id: "p1", completed_at: isoAt(14) }),
      task({ assignee_id: "p2", completed_at: isoAt(11) }),
    ];
    const summary = summarizeCompletions(tasks, PROFILES, NOW, "day");
    expect(summary.perPerson).toEqual([
      { profileId: "p1", name: "Ada", count: 2 },
      { profileId: "p2", name: "Bo", count: 1 },
    ]);
    expect(summary.total).toBe(3);
  });

  it("ignores in-progress tasks and tasks completed before today (day range)", () => {
    const tasks = [
      task({ assignee_id: "p1", status: "inprogress", completed_at: null }),
      task({ assignee_id: "p1", completed_at: isoAt(15, 8) }), // 2 days ago
      task({ assignee_id: "p2", completed_at: isoAt(12) }), // today
    ];
    const summary = summarizeCompletions(tasks, PROFILES, NOW, "day");
    expect(summary.perPerson).toEqual([{ profileId: "p2", name: "Bo", count: 1 }]);
    expect(summary.total).toBe(1);
  });

  it("counts the whole last 7 days for the week range", () => {
    const tasks = [
      task({ assignee_id: "p1", completed_at: isoAt(15, 5) }), // 5 days ago
      task({ assignee_id: "p1", completed_at: isoAt(15, 2) }), // 8 days ago - too old
      task({ assignee_id: "p2", completed_at: isoAt(15, 9) }), // yesterday
    ];
    const summary = summarizeCompletions(tasks, PROFILES, NOW, "week");
    expect(summary.total).toBe(2);
    expect(summary.perPerson.map((p) => p.profileId).sort()).toEqual(["p1", "p2"]);
  });

  it("falls back to 'Unknown' for an assignee with no profile", () => {
    const summary = summarizeCompletions(
      [task({ assignee_id: "ghost", completed_at: isoAt(12) })],
      PROFILES,
      NOW,
      "day"
    );
    expect(summary.perPerson).toEqual([
      { profileId: "ghost", name: "Unknown", count: 1 },
    ]);
  });

  it("returns an empty summary when nothing qualifies", () => {
    expect(summarizeCompletions([], PROFILES, NOW, "day")).toEqual({
      perPerson: [],
      total: 0,
    });
  });
});
