import { describe, expect, it } from "vitest";
import { resolveDrop } from "../dnd";

describe("resolveDrop", () => {
  it("reassigns a task dropped on a different member's card", () => {
    expect(
      resolveDrop({ kind: "task", id: "t1", assigneeId: "a" }, "b")
    ).toEqual({ type: "reassign", taskId: "t1", to: "b" });
  });

  it("is a no-op when a task is dropped on its current owner", () => {
    expect(
      resolveDrop({ kind: "task", id: "t1", assigneeId: "a" }, "a")
    ).toBeNull();
  });

  it("converts a team todo into a task for the target member", () => {
    expect(resolveDrop({ kind: "todo", id: "i1" }, "b")).toEqual({
      type: "convert",
      itemId: "i1",
      to: "b",
    });
  });
});
