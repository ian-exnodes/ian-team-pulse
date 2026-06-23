import { describe, expect, it } from "vitest";
import { filterTeamItems, groupTasksByAssignee, sortProfilesByUser } from "../views";
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
    id: Math.random().toString(36).slice(2),
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
    id: Math.random().toString(36).slice(2),
    type: "todo",
    content: "Item",
    link: null,
    done: false,
    created_by: "p1",
    created_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

describe("sortProfilesByUser", () => {
  it("puts the current user first, then alphabetical by display name", () => {
    const profiles = [
      profile({ id: "zoe", display_name: "Zoe" }),
      profile({ id: "me", display_name: "Mason" }),
      profile({ id: "ada", display_name: "Ada" }),
    ];
    const sorted = sortProfilesByUser(profiles, "me");
    expect(sorted.map((p) => p.id)).toEqual(["me", "ada", "zoe"]);
  });

  it("is purely alphabetical when the current user is absent", () => {
    const profiles = [
      profile({ id: "zoe", display_name: "Zoe" }),
      profile({ id: "ada", display_name: "Ada" }),
    ];
    expect(sortProfilesByUser(profiles, "nobody").map((p) => p.id)).toEqual(["ada", "zoe"]);
  });

  it("does not mutate the input array", () => {
    const profiles = [profile({ id: "b", display_name: "B" }), profile({ id: "a", display_name: "A" })];
    sortProfilesByUser(profiles, "x");
    expect(profiles.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("groupTasksByAssignee", () => {
  it("buckets tasks by assignee_id", () => {
    const tasks = [
      task({ id: "t1", assignee_id: "a" }),
      task({ id: "t2", assignee_id: "b" }),
      task({ id: "t3", assignee_id: "a" }),
    ];
    const grouped = groupTasksByAssignee(tasks);
    expect(grouped.a.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(grouped.b.map((t) => t.id)).toEqual(["t2"]);
  });

  it("returns an empty object for no tasks", () => {
    expect(groupTasksByAssignee([])).toEqual({});
  });
});

describe("filterTeamItems", () => {
  it("returns todos oldest-first", () => {
    const items = [
      teamItem({ id: "new", type: "todo", created_at: "2026-06-03T00:00:00.000Z" }),
      teamItem({ id: "old", type: "todo", created_at: "2026-06-01T00:00:00.000Z" }),
      teamItem({ id: "tbd", type: "tbd", created_at: "2026-06-02T00:00:00.000Z" }),
    ];
    expect(filterTeamItems(items, "todo").map((i) => i.id)).toEqual(["old", "new"]);
  });

  it("returns blockers newest-first", () => {
    const items = [
      teamItem({ id: "old", type: "tbd", created_at: "2026-06-01T00:00:00.000Z" }),
      teamItem({ id: "new", type: "tbd", created_at: "2026-06-03T00:00:00.000Z" }),
      teamItem({ id: "todo", type: "todo", created_at: "2026-06-02T00:00:00.000Z" }),
    ];
    expect(filterTeamItems(items, "tbd").map((i) => i.id)).toEqual(["new", "old"]);
  });
});
