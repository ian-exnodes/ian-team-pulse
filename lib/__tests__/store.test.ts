import { describe, expect, it } from "vitest";
import { reducer, toMap, type Store } from "../store";
import type { Profile, Task, TeamItem } from "../types";

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

function teamItem(over: Partial<TeamItem>): TeamItem {
  return {
    id: "i1",
    type: "todo",
    content: "Ship it",
    link: null,
    done: false,
    created_by: "p1",
    created_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

function emptyStore(): Store {
  return { profiles: {}, tasks: {}, teamItems: {}, connection: "connecting" };
}

describe("toMap", () => {
  it("keys rows by id", () => {
    expect(toMap([task({ id: "a" }), task({ id: "b" })])).toEqual({
      a: task({ id: "a" }),
      b: task({ id: "b" }),
    });
  });

  it("last write wins on duplicate ids", () => {
    const map = toMap([task({ id: "a", title: "first" }), task({ id: "a", title: "second" })]);
    expect(map.a.title).toBe("second");
  });
});

describe("reducer / hydrate", () => {
  it("replaces all three table maps and keeps connection", () => {
    const start: Store = { ...emptyStore(), connection: "live", tasks: { old: task({ id: "old" }) } };
    const next = reducer(start, {
      type: "hydrate",
      profiles: [profile({ id: "p1" })],
      tasks: [task({ id: "t1" })],
      teamItems: [teamItem({ id: "i1" })],
    });
    expect(next.profiles).toEqual({ p1: profile({ id: "p1" }) });
    expect(next.tasks).toEqual({ t1: task({ id: "t1" }) });
    expect(next.teamItems).toEqual({ i1: teamItem({ id: "i1" }) });
    expect(next.tasks.old).toBeUndefined();
    expect(next.connection).toBe("live");
  });
});

describe("reducer / upsert", () => {
  it("adds a new row", () => {
    const next = reducer(emptyStore(), { type: "upsert", table: "tasks", row: task({ id: "t1" }) });
    expect(next.tasks.t1).toEqual(task({ id: "t1" }));
  });

  it("overwrites an existing row by id", () => {
    const start = reducer(emptyStore(), { type: "upsert", table: "tasks", row: task({ id: "t1", title: "old" }) });
    const next = reducer(start, { type: "upsert", table: "tasks", row: task({ id: "t1", title: "new" }) });
    expect(next.tasks.t1.title).toBe("new");
  });

  it("does not mutate the previous store", () => {
    const start = emptyStore();
    reducer(start, { type: "upsert", table: "tasks", row: task({ id: "t1" }) });
    expect(start.tasks).toEqual({});
  });
});

describe("reducer / remove", () => {
  it("deletes a row by id", () => {
    const start = reducer(emptyStore(), { type: "upsert", table: "tasks", row: task({ id: "t1" }) });
    const next = reducer(start, { type: "remove", table: "tasks", id: "t1" });
    expect(next.tasks.t1).toBeUndefined();
  });

  it("is a no-op for an unknown id", () => {
    const start = reducer(emptyStore(), { type: "upsert", table: "tasks", row: task({ id: "t1" }) });
    const next = reducer(start, { type: "remove", table: "tasks", id: "missing" });
    expect(next.tasks).toEqual({ t1: task({ id: "t1" }) });
  });
});

describe("reducer / rollback", () => {
  it("restores the row when the store still holds the optimistic value", () => {
    const original = task({ id: "t1", status: "inprogress" });
    const optimistic = task({ id: "t1", status: "done" });
    const afterOptimistic = reducer(emptyStore(), { type: "upsert", table: "tasks", row: optimistic });
    const rolledBack = reducer(afterOptimistic, {
      type: "rollback",
      table: "tasks",
      id: "t1",
      ifCurrentIs: optimistic,
      row: original,
    });
    expect(rolledBack.tasks.t1).toEqual(original);
  });

  it("does NOT clobber a fresher row that replaced the optimistic one", () => {
    const optimistic = task({ id: "t1", status: "done" });
    const fresher = task({ id: "t1", status: "done", title: "renamed by realtime" });
    let store = reducer(emptyStore(), { type: "upsert", table: "tasks", row: optimistic });
    // A realtime event lands a different object before the rollback runs.
    store = reducer(store, { type: "upsert", table: "tasks", row: fresher });
    const rolledBack = reducer(store, {
      type: "rollback",
      table: "tasks",
      id: "t1",
      ifCurrentIs: optimistic,
      row: task({ id: "t1", status: "inprogress" }),
    });
    expect(rolledBack.tasks.t1).toBe(fresher);
  });

  it("restores a deleted row only when nothing re-added it (ifCurrentIs undefined)", () => {
    // Optimistic delete left the slot empty; rollback with ifCurrentIs:undefined restores.
    const restored = task({ id: "t1" });
    const afterDelete = emptyStore();
    const rolledBack = reducer(afterDelete, {
      type: "rollback",
      table: "tasks",
      id: "t1",
      ifCurrentIs: undefined,
      row: restored,
    });
    expect(rolledBack.tasks.t1).toEqual(restored);
  });

  it("does NOT restore a deleted row if a realtime event re-added it", () => {
    const reAdded = task({ id: "t1", title: "back from realtime" });
    const store = reducer(emptyStore(), { type: "upsert", table: "tasks", row: reAdded });
    const rolledBack = reducer(store, {
      type: "rollback",
      table: "tasks",
      id: "t1",
      ifCurrentIs: undefined,
      row: task({ id: "t1", title: "stale" }),
    });
    expect(rolledBack.tasks.t1).toBe(reAdded);
  });
});

describe("reducer / connection", () => {
  it("transitions connection state", () => {
    const next = reducer(emptyStore(), { type: "connection", value: "reconnecting" });
    expect(next.connection).toBe("reconnecting");
  });
});
