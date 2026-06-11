import { describe, expect, it } from "vitest";
import { authorizeUrl, isExpired, jiraBrowseUrl, mapIssue } from "../jira";

describe("jiraBrowseUrl", () => {
  it("builds a browse URL", () => {
    expect(jiraBrowseUrl("https://acme.atlassian.net", "CPD-12")).toBe(
      "https://acme.atlassian.net/browse/CPD-12"
    );
  });

  it("trims a trailing slash on the site URL", () => {
    expect(jiraBrowseUrl("https://acme.atlassian.net/", "CPD-12")).toBe(
      "https://acme.atlassian.net/browse/CPD-12"
    );
  });
});

describe("isExpired", () => {
  const now = new Date("2026-06-11T12:00:00Z");

  it("is true once past expiry", () => {
    expect(isExpired("2026-06-11T11:00:00Z", now)).toBe(true);
  });

  it("is true within the 60s safety buffer", () => {
    expect(isExpired("2026-06-11T12:00:30Z", now)).toBe(true);
  });

  it("is false when comfortably valid", () => {
    expect(isExpired("2026-06-11T13:00:00Z", now)).toBe(false);
  });
});

describe("mapIssue", () => {
  it("maps summary, key, status, and browse URL", () => {
    expect(
      mapIssue(
        { key: "CPD-3481", fields: { summary: "Fix bug", status: { name: "In Progress" } } },
        "https://acme.atlassian.net"
      )
    ).toEqual({
      key: "CPD-3481",
      summary: "Fix bug",
      url: "https://acme.atlassian.net/browse/CPD-3481",
      status: "In Progress",
    });
  });

  it("falls back to the key when summary is missing", () => {
    expect(mapIssue({ key: "CPD-9" }, "https://acme.atlassian.net")).toEqual({
      key: "CPD-9",
      summary: "CPD-9",
      url: "https://acme.atlassian.net/browse/CPD-9",
      status: null,
    });
  });
});

describe("authorizeUrl", () => {
  it("includes client id, redirect, state, and offline scope", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "abc",
        redirectUri: "http://localhost:3000/api/jira/callback",
        state: "xyz",
      })
    );
    expect(url.origin + url.pathname).toBe("https://auth.atlassian.com/authorize");
    expect(url.searchParams.get("client_id")).toBe("abc");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/jira/callback"
    );
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});
