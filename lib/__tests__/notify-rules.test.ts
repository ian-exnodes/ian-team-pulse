import { describe, expect, it } from "vitest";
import {
  classifyTaskChange,
  classifyTaskSnapshot,
  shouldNotifyTeamTodo,
} from "../notify-rules";
import type { Task, TeamItem } from "../types";

const ME = "me";
const OTHER = "other";

function task(over: Partial<Task>): Task {
  return {
    id: "t1",
    title: "A task",
    link: null,
    status: "inprogress",
    assignee_id: OTHER,
    created_by: OTHER,
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
    created_by: OTHER,
    created_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

describe("classifyTaskChange (live events)", () => {
  it("'done' when a teammate completes their own task", () => {
    const kind = classifyTaskChange({
      eventType: "UPDATE",
      task: task({ assignee_id: OTHER, status: "done" }),
      prevStatus: "inprogress",
      prevAssignee: OTHER,
      currentUserId: ME,
    });
    expect(kind).toBe("done");
  });

  it("not 'done' when the completed task is mine (I did it)", () => {
    const kind = classifyTaskChange({
      eventType: "UPDATE",
      task: task({ assignee_id: ME, status: "done" }),
      prevStatus: "inprogress",
      prevAssignee: ME,
      currentUserId: ME,
    });
    expect(kind).toBeNull();
  });

  it("not 'done' when prevStatus is unknown (avoids firing on first sight)", () => {
    const kind = classifyTaskChange({
      eventType: "UPDATE",
      task: task({ assignee_id: OTHER, status: "done" }),
      prevStatus: undefined,
      prevAssignee: OTHER,
      currentUserId: ME,
    });
    expect(kind).toBeNull();
  });

  it("'assigned' when someone reassigns an existing task to me", () => {
    const kind = classifyTaskChange({
      eventType: "UPDATE",
      task: task({ assignee_id: ME }),
      prevStatus: "inprogress",
      prevAssignee: OTHER,
      currentUserId: ME,
    });
    expect(kind).toBe("assigned");
  });

  it("suppresses my own INSERT echo (I created and assigned to myself)", () => {
    const kind = classifyTaskChange({
      eventType: "INSERT",
      task: task({ assignee_id: ME, created_by: ME }),
      prevStatus: undefined,
      prevAssignee: undefined,
      currentUserId: ME,
    });
    expect(kind).toBeNull();
  });

  it("still notifies on an INSERT assigned to me but created by someone else", () => {
    const kind = classifyTaskChange({
      eventType: "INSERT",
      task: task({ assignee_id: ME, created_by: OTHER }),
      prevStatus: undefined,
      prevAssignee: undefined,
      currentUserId: ME,
    });
    expect(kind).toBe("assigned");
  });

  it("does not re-notify when the task was already mine (no real reassignment)", () => {
    const kind = classifyTaskChange({
      eventType: "UPDATE",
      task: task({ assignee_id: ME }),
      prevStatus: "inprogress",
      prevAssignee: ME,
      currentUserId: ME,
    });
    expect(kind).toBeNull();
  });
});

describe("classifyTaskSnapshot (missed while offline)", () => {
  it("'done' for a teammate's completion seen only via snapshot", () => {
    const kind = classifyTaskSnapshot({
      task: task({ assignee_id: OTHER, status: "done" }),
      prevStatus: "inprogress",
      prevAssignee: OTHER,
      currentUserId: ME,
    });
    expect(kind).toBe("done");
  });

  it("'assigned' when the assignee became me while offline", () => {
    const kind = classifyTaskSnapshot({
      task: task({ assignee_id: ME }),
      prevStatus: "inprogress",
      prevAssignee: OTHER,
      currentUserId: ME,
    });
    expect(kind).toBe("assigned");
  });

  it("no notification when the task was already mine before", () => {
    const kind = classifyTaskSnapshot({
      task: task({ assignee_id: ME }),
      prevStatus: "inprogress",
      prevAssignee: ME,
      currentUserId: ME,
    });
    expect(kind).toBeNull();
  });
});

describe("shouldNotifyTeamTodo", () => {
  it("notifies for a teammate's new todo", () => {
    expect(shouldNotifyTeamTodo(teamItem({ created_by: OTHER }), ME)).toBe(true);
  });

  it("ignores my own todo", () => {
    expect(shouldNotifyTeamTodo(teamItem({ created_by: ME }), ME)).toBe(false);
  });

  it("ignores blockers (tbd)", () => {
    expect(shouldNotifyTeamTodo(teamItem({ type: "tbd", created_by: OTHER }), ME)).toBe(false);
  });
});
