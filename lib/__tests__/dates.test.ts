import { describe, expect, it } from "vitest";
import {
  doneWindowStart,
  isDoneToday,
  isToday,
  relativeTime,
  sameLocalDay,
} from "../dates";

describe("sameLocalDay", () => {
  it("is true for two times on the same local day", () => {
    expect(
      sameLocalDay(new Date(2026, 5, 10, 0, 1), new Date(2026, 5, 10, 23, 59))
    ).toBe(true);
  });

  it("is false across midnight", () => {
    expect(
      sameLocalDay(new Date(2026, 5, 10, 23, 59), new Date(2026, 5, 11, 0, 1))
    ).toBe(false);
  });

  it("is false for same day-of-month in different months", () => {
    expect(
      sameLocalDay(new Date(2026, 4, 10), new Date(2026, 5, 10))
    ).toBe(false);
  });
});

describe("isToday", () => {
  const now = new Date(2026, 5, 10, 12, 0);

  it("is true for an ISO timestamp earlier the same day", () => {
    expect(isToday(new Date(2026, 5, 10, 8, 30).toISOString(), now)).toBe(true);
  });

  it("is false for yesterday", () => {
    expect(isToday(new Date(2026, 5, 9, 23, 59).toISOString(), now)).toBe(false);
  });

  it("is false for null", () => {
    expect(isToday(null, now)).toBe(false);
  });
});

describe("doneWindowStart", () => {
  it("is yesterday 9pm before 9pm", () => {
    expect(doneWindowStart(new Date(2026, 5, 10, 12, 0))).toEqual(
      new Date(2026, 5, 9, 21, 0)
    );
  });

  it("is today 9pm from 9pm onward", () => {
    expect(doneWindowStart(new Date(2026, 5, 10, 21, 0))).toEqual(
      new Date(2026, 5, 10, 21, 0)
    );
    expect(doneWindowStart(new Date(2026, 5, 10, 23, 30))).toEqual(
      new Date(2026, 5, 10, 21, 0)
    );
  });
});

describe("isDoneToday", () => {
  it("includes tasks completed earlier the same day, before 9pm", () => {
    const now = new Date(2026, 5, 10, 17, 0);
    expect(isDoneToday(new Date(2026, 5, 10, 8, 0).toISOString(), now)).toBe(
      true
    );
  });

  it("clears at 9pm: the same task no longer counts", () => {
    const task = new Date(2026, 5, 10, 8, 0).toISOString();
    expect(isDoneToday(task, new Date(2026, 5, 10, 20, 59))).toBe(true);
    expect(isDoneToday(task, new Date(2026, 5, 10, 21, 0))).toBe(false);
  });

  it("counts work after 9pm toward the next day", () => {
    const lateTask = new Date(2026, 5, 9, 22, 0).toISOString();
    expect(isDoneToday(lateTask, new Date(2026, 5, 10, 9, 0))).toBe(true);
  });

  it("is false for null", () => {
    expect(isDoneToday(null, new Date(2026, 5, 10, 12, 0))).toBe(false);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("says just now under a minute", () => {
    expect(relativeTime("2026-06-10T11:59:30Z", now)).toBe("just now");
  });

  it("uses minutes under an hour", () => {
    expect(relativeTime("2026-06-10T11:15:00Z", now)).toBe("45m ago");
  });

  it("uses hours under a day", () => {
    expect(relativeTime("2026-06-10T10:00:00Z", now)).toBe("2h ago");
  });

  it("uses days beyond that", () => {
    expect(relativeTime("2026-06-07T12:00:00Z", now)).toBe("3d ago");
  });
});
