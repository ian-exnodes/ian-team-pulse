import { describe, expect, it } from "vitest";
import {
  authorizeUrl,
  buildSearchJql,
  isExpired,
  jiraBrowseUrl,
  jiraKeyFromUrl,
  mapIssue,
} from "../jira";

describe("jiraKeyFromUrl", () => {
  it("extracts the issue key from a browse URL", () => {
    expect(
      jiraKeyFromUrl("https://careforkids.atlassian.net/browse/CPD-3384")
    ).toBe("CPD-3384");
  });

  it("ignores query strings and fragments", () => {
    expect(
      jiraKeyFromUrl("https://acme.atlassian.net/browse/AB2-7?focusedId=1#x")
    ).toBe("AB2-7");
  });

  it("returns null for non-Jira links", () => {
    expect(jiraKeyFromUrl("https://github.com/acme/repo/pull/12")).toBe(null);
    expect(jiraKeyFromUrl("https://acme.atlassian.net/browse/lowercase-1")).toBe(
      null
    );
  });

  it("returns null for null", () => {
    expect(jiraKeyFromUrl(null)).toBe(null);
  });
});

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
  it("maps summary, key, status, assignee, and browse URL", () => {
    expect(
      mapIssue(
        {
          key: "CPD-3481",
          fields: {
            summary: "Fix bug",
            status: { name: "In Progress" },
            assignee: { displayName: "Ada Lovelace" },
          },
        },
        "https://acme.atlassian.net"
      )
    ).toEqual({
      key: "CPD-3481",
      summary: "Fix bug",
      url: "https://acme.atlassian.net/browse/CPD-3481",
      status: "In Progress",
      assignee: "Ada Lovelace",
    });
  });

  it("falls back to the key, and assignee is null when unassigned", () => {
    expect(mapIssue({ key: "CPD-9" }, "https://acme.atlassian.net")).toEqual({
      key: "CPD-9",
      summary: "CPD-9",
      url: "https://acme.atlassian.net/browse/CPD-9",
      status: null,
      assignee: null,
    });
  });
});

describe("buildSearchJql", () => {
  it("restricts to the four workflow statuses with no keyword", () => {
    expect(buildSearchJql("")).toBe(
      'status in ("To Do", "Ready", "Blocked", "In Progress") ORDER BY updated DESC'
    );
  });

  it("adds a summary prefix match for a keyword", () => {
    expect(buildSearchJql("  login  ")).toBe(
      'status in ("To Do", "Ready", "Blocked", "In Progress") AND summary ~ "login*" ORDER BY updated DESC'
    );
  });

  it("escapes quotes and backslashes in the keyword", () => {
    expect(buildSearchJql('a"b\\c')).toContain('summary ~ "a\\"b\\\\c*"');
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
