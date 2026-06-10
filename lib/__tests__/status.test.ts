import { describe, expect, it } from "vitest";
import { deriveStatus } from "../status";
import type { Task } from "../types";

function task(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    title: "A task",
    link: null,
    status: "inprogress",
    assignee_id: "p1",
    created_by: "p1",
    completed_at: null,
    created_at: "2026-06-10T08:00:00Z",
    updated_at: "2026-06-10T08:00:00Z",
    ...overrides,
  };
}

describe("deriveStatus", () => {
  it("manual off always wins, even with in-progress tasks", () => {
    expect(
      deriveStatus({ manual_status: "off" }, [task({ status: "inprogress" })])
    ).toBe("off");
  });

  it("is inprogress when any task is in progress", () => {
    expect(
      deriveStatus({ manual_status: null }, [
        task({ status: "done" }),
        task({ id: "t2", status: "inprogress" }),
      ])
    ).toBe("inprogress");
  });

  it("is chill with only done tasks", () => {
    expect(deriveStatus({ manual_status: null }, [task({ status: "done" })])).toBe(
      "chill"
    );
  });

  it("is chill with no tasks", () => {
    expect(deriveStatus({ manual_status: null }, [])).toBe("chill");
  });
});
