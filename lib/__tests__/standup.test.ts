import { describe, expect, it } from "vitest";
import { needsStandupPrompt } from "../standup";
import type { Profile, Task } from "../types";

const NOW = new Date(2026, 5, 10, 17, 0); // June 10, 5pm local
// doneWindowStart(NOW) is June 9, 9pm (since 17 < 21).
const TODAY_ISO = new Date(2026, 5, 10, 8, 0).toISOString(); // after the boundary
const YESTERDAY_ISO = new Date(2026, 5, 9, 12, 0).toISOString(); // before the boundary

function profile(over: Partial<Profile>): Profile {
  return {
    id: "me",
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
    assignee_id: "me",
    created_by: "me",
    completed_at: null,
    created_at: "2026-06-10T08:00:00.000Z",
    updated_at: "2026-06-10T08:00:00.000Z",
    ...over,
  };
}

describe("needsStandupPrompt", () => {
  it("prompts when not off, nothing in progress, and never prompted", () => {
    expect(
      needsStandupPrompt({
        profile: profile({}),
        myInProgressTasks: [],
        lastPromptedAt: null,
        now: NOW,
      })
    ).toBe(true);
  });

  it("prompts again the next workday (last prompt was before today's 9pm boundary)", () => {
    expect(
      needsStandupPrompt({
        profile: profile({}),
        myInProgressTasks: [],
        lastPromptedAt: YESTERDAY_ISO,
        now: NOW,
      })
    ).toBe(true);
  });

  it("does not prompt when already handled today", () => {
    expect(
      needsStandupPrompt({
        profile: profile({}),
        myInProgressTasks: [],
        lastPromptedAt: TODAY_ISO,
        now: NOW,
      })
    ).toBe(false);
  });

  it("does not prompt when there is already an in-progress task", () => {
    expect(
      needsStandupPrompt({
        profile: profile({}),
        myInProgressTasks: [task({})],
        lastPromptedAt: null,
        now: NOW,
      })
    ).toBe(false);
  });

  it("does not prompt members who are Off", () => {
    expect(
      needsStandupPrompt({
        profile: profile({ manual_status: "off" }),
        myInProgressTasks: [],
        lastPromptedAt: null,
        now: NOW,
      })
    ).toBe(false);
  });

  it("does not prompt before the profile has loaded", () => {
    expect(
      needsStandupPrompt({
        profile: undefined,
        myInProgressTasks: [],
        lastPromptedAt: null,
        now: NOW,
      })
    ).toBe(false);
  });
});
