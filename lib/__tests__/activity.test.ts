import { describe, expect, it } from "vitest";
import { renderActivity, type ActivityRow } from "../activity";

const NAMES = { me: "Ada", henry: "Henry", chi: "Chi" };

function row(over: Partial<ActivityRow>): ActivityRow {
  return {
    id: "a1",
    actor_id: "henry",
    type: "task_added",
    target_user_id: null,
    entity_id: "e1",
    detail: "Fix bug",
    meta: null,
    created_at: "2026-06-11T10:00:00Z",
    ...over,
  };
}

// Collapse segments to a plain string for readable assertions.
const text = (segs: ReturnType<typeof renderActivity>) =>
  segs.map((s) => s.value).join("");

describe("renderActivity", () => {
  it("renders the actor as 'You' (capitalised) when it's the current user", () => {
    const segs = renderActivity(row({ actor_id: "me" }), "me", NAMES);
    expect(segs[0]).toEqual({
      kind: "name",
      value: "You",
      isYou: true,
      userId: "me",
    });
    expect(text(segs)).toBe("You added a new task: Fix bug");
  });

  it("renders another member's name, not 'You'", () => {
    const segs = renderActivity(row({ actor_id: "henry" }), "me", NAMES);
    expect(segs[0]).toEqual({
      kind: "name",
      value: "Henry",
      isYou: false,
      userId: "henry",
    });
  });

  it("assigns to 'you' (lowercase) when you're the target", () => {
    expect(
      text(
        renderActivity(
          row({ type: "task_assigned", actor_id: "henry", target_user_id: "me" }),
          "me",
          NAMES
        )
      )
    ).toBe("Henry assigned Fix bug to you");
  });

  it("names the target member when it's someone else", () => {
    expect(
      text(
        renderActivity(
          row({ type: "task_assigned", actor_id: "me", target_user_id: "chi" }),
          "me",
          NAMES
        )
      )
    ).toBe("You assigned Fix bug to Chi");
  });

  it("carries the actor and target user ids on name segments", () => {
    const segs = renderActivity(
      row({ type: "task_assigned", actor_id: "henry", target_user_id: "me" }),
      "me",
      NAMES
    );
    const names = segs.filter((s) => s.kind === "name");
    expect(names[0]).toMatchObject({ value: "Henry", userId: "henry" });
    expect(names[1]).toMatchObject({ value: "you", userId: "me" });
  });

  it("uses a null userId for an unknown/deleted actor", () => {
    const segs = renderActivity(row({ actor_id: null }), "me", NAMES);
    expect(segs[0]).toMatchObject({ value: "Someone", userId: null });
  });

  it("uses 'a task for X' when a new task is created for someone else", () => {
    expect(
      text(
        renderActivity(
          row({ type: "task_added", actor_id: "me", target_user_id: "chi" }),
          "me",
          NAMES
        )
      )
    ).toBe("You added a task for Chi: Fix bug");
  });

  it("phrases status changes without repeating the badge word", () => {
    expect(
      text(renderActivity(row({ type: "status_off", actor_id: "me", detail: null }), "me", NAMES))
    ).toBe("You stepped away");
    expect(
      text(renderActivity(row({ type: "status_back", actor_id: "henry", detail: null }), "me", NAMES))
    ).toBe("Henry returned");
    expect(
      text(renderActivity(row({ type: "status_back", actor_id: "me", detail: null }), "me", NAMES))
    ).toBe("You returned");
  });

  it("covers done, todo and blocker phrasings", () => {
    expect(text(renderActivity(row({ type: "task_done", actor_id: "me" }), "me", NAMES))).toBe(
      "You completed Fix bug"
    );
    expect(
      text(renderActivity(row({ type: "todo_checked", actor_id: "chi", detail: "Book room" }), "me", NAMES))
    ).toBe("Chi checked off Book room");
    expect(
      text(renderActivity(row({ type: "tbd_raised", actor_id: "me", detail: "Staging down" }), "me", NAMES))
    ).toBe("You raised a blocker: Staging down");
  });

  it("falls back to 'Someone' for an unknown/deleted actor", () => {
    expect(text(renderActivity(row({ actor_id: null }), "me", NAMES))).toBe(
      "Someone added a new task: Fix bug"
    );
  });
});
