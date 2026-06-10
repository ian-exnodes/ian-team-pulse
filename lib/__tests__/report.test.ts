import { describe, expect, it } from "vitest";
import { buildReport } from "../report";
import type { Task } from "../types";

const NOW = new Date(2026, 5, 10, 17, 0); // local time

function isoAt(hour: number, day = 10): string {
  return new Date(2026, 5, day, hour, 0).toISOString();
}

function task(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: "A task",
    link: null,
    status: "inprogress",
    assignee_id: "p1",
    created_by: "p1",
    completed_at: null,
    created_at: isoAt(8),
    updated_at: isoAt(8),
    ...overrides,
  };
}

describe("buildReport", () => {
  it("formats linked and unlinked tasks exactly per spec", () => {
    const tasks = [
      task({
        title: "Implement popup Sentiment ratings",
        link: "https://careforkids.atlassian.net/browse/CPD-3463",
        status: "inprogress",
      }),
      task({
        title: "Fix bug review module",
        link: "https://careforkids.atlassian.net/browse/CPD-3481",
        status: "done",
        completed_at: isoAt(15),
      }),
      task({ title: "Update onboarding docs", status: "inprogress", created_at: isoAt(9) }),
    ];

    expect(buildReport(tasks, NOW)).toBe(
      "https://careforkids.atlassian.net/browse/CPD-3463 Implement popup Sentiment ratings ( inprogress )\n" +
        "Update onboarding docs ( inprogress )\n" +
        "https://careforkids.atlassian.net/browse/CPD-3481 Fix bug review module ( done )\n"
    );
  });

  it("lists in-progress tasks (created_at asc) before done-today (completed_at asc)", () => {
    const tasks = [
      task({ title: "Done later", status: "done", completed_at: isoAt(16) }),
      task({ title: "Done earlier", status: "done", completed_at: isoAt(9) }),
      task({ title: "Started second", created_at: isoAt(11) }),
      task({ title: "Started first", created_at: isoAt(7) }),
    ];

    expect(buildReport(tasks, NOW)).toBe(
      "Started first ( inprogress )\n" +
        "Started second ( inprogress )\n" +
        "Done earlier ( done )\n" +
        "Done later ( done )\n"
    );
  });

  it("omits tasks completed before today", () => {
    const tasks = [
      task({ title: "Old win", status: "done", completed_at: isoAt(15, 9) }),
      task({ title: "Current work" }),
    ];

    expect(buildReport(tasks, NOW)).toBe("Current work ( inprogress )\n");
  });

  it("returns an empty string when there is nothing current", () => {
    expect(buildReport([], NOW)).toBe("");
    expect(
      buildReport([task({ status: "done", completed_at: isoAt(15, 8) })], NOW)
    ).toBe("");
  });
});
