import { describe, expect, it, vi } from "vitest";
import { optimisticUpdate } from "../optimistic";
import type { Action } from "../store";
import type { Task } from "../types";

function task(over: Partial<Task>): Task {
  return {
    id: "t1",
    title: "A task",
    link: null,
    status: "inprogress",
    assignee_id: "p1",
    created_by: "p1",
    completed_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

describe("optimisticUpdate", () => {
  it("dispatches the optimistic upsert immediately, then commits on success", async () => {
    const actions: Action[] = [];
    const optimistic = task({ status: "done" });
    const ok = await optimisticUpdate({
      table: "tasks",
      id: "t1",
      optimistic,
      original: task({ status: "inprogress" }),
      dispatch: (a) => actions.push(a),
      run: async () => ({ data: [{ id: "t1" }], error: null }),
      onError: () => {
        throw new Error("onError should not fire on success");
      },
    });
    expect(ok).toBe(true);
    expect(actions).toEqual([{ type: "upsert", table: "tasks", row: optimistic }]);
  });

  it("rolls back (guarded) and calls onError when the write errors", async () => {
    const actions: Action[] = [];
    const optimistic = task({ status: "done" });
    const original = task({ status: "inprogress" });
    const onError = vi.fn();
    const ok = await optimisticUpdate({
      table: "tasks",
      id: "t1",
      optimistic,
      original,
      dispatch: (a) => actions.push(a),
      run: async () => ({ data: null, error: new Error("boom") }),
      onError,
    });
    expect(ok).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    expect(actions).toEqual([
      { type: "upsert", table: "tasks", row: optimistic },
      { type: "rollback", table: "tasks", id: "t1", ifCurrentIs: optimistic, row: original },
    ]);
  });

  it("treats an RLS-denied write (0 rows, no error) as a failure", async () => {
    const onError = vi.fn();
    const ok = await optimisticUpdate({
      table: "tasks",
      id: "t1",
      optimistic: task({ status: "done" }),
      original: task({ status: "inprogress" }),
      dispatch: () => {},
      run: async () => ({ data: [], error: null }),
      onError,
    });
    expect(ok).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
  });
});
