// Jira Cloud OAuth 2.0 (3LO) + REST helpers. The pure functions at the top are
// unit-tested; the fetch-based functions below run only in server route
// handlers (they need the client secret / user tokens).

export const JIRA_SCOPES = "read:jira-work read:me offline_access";

// Search is restricted to these workflow statuses. NOTE: these must match the
// status names in your Jira project exactly - adjust if your board differs.
export const SEARCH_STATUSES = ["To Do", "Ready", "Blocked", "In Progress"];

// Builds the JQL for the import search: always restricted to SEARCH_STATUSES,
// optionally narrowed by a summary keyword (prefix match).
export function buildSearchJql(keyword: string): string {
  const statusClause = `status in (${SEARCH_STATUSES.map((s) => `"${s}"`).join(", ")})`;
  const kw = keyword.trim();
  if (!kw) return `${statusClause} ORDER BY updated DESC`;
  const escaped = kw.replace(/[\\"]/g, "\\$&"); // safe inside a JQL string literal
  return `${statusClause} AND summary ~ "${escaped}*" ORDER BY updated DESC`;
}

export interface JiraIssue {
  key: string;
  summary: string;
  url: string;
  status: string | null;
  assignee: string | null;
}

// ---------- Pure helpers (unit-tested) ----------

export function jiraBrowseUrl(siteUrl: string, key: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/browse/${key}`;
}

// The reverse: pull the issue key out of a link if it is a Jira browse
// URL (any site), so task rows can show "[CPD-3384]" before the title.
export function jiraKeyFromUrl(link: string | null): string | null {
  if (!link) return null;
  const match =
    /^https?:\/\/[^/\s]+\/browse\/([A-Z][A-Z0-9_]*-\d+)(?:[?#]|$)/.exec(link);
  return match?.[1] ?? null;
}

// Treat a token as expired a minute early so a request never races the clock.
export function isExpired(expiresAtIso: string, now: Date): boolean {
  return new Date(expiresAtIso).getTime() - 60_000 <= now.getTime();
}

type RawIssue = {
  key: string;
  fields?: {
    summary?: string | null;
    status?: { name?: string | null } | null;
    assignee?: { displayName?: string | null } | null;
  };
};

export function mapIssue(raw: RawIssue, siteUrl: string): JiraIssue {
  return {
    key: raw.key,
    summary: raw.fields?.summary?.trim() || raw.key,
    url: jiraBrowseUrl(siteUrl, raw.key),
    status: raw.fields?.status?.name ?? null,
    assignee: raw.fields?.assignee?.displayName ?? null,
  };
}

// ---------- Server-side OAuth + REST (route handlers only) ----------

const AUTH_BASE = "https://auth.atlassian.com";
const API_BASE = "https://api.atlassian.com";

export interface JiraTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export function authorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: opts.clientId,
    scope: JIRA_SCOPES,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    response_type: "code",
    prompt: "consent",
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<JiraTokens> {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Jira token exchange failed (${res.status})`);
  return res.json();
}

export async function refreshTokens(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<JiraTokens> {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      refresh_token: opts.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Jira token refresh failed (${res.status})`);
  return res.json();
}

// The Jira site(s) this token can reach. Returns the first one.
export async function getPrimarySite(
  accessToken: string
): Promise<{ cloudId: string; siteUrl: string }> {
  const res = await fetch(`${API_BASE}/oauth/token/accessible-resources`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira resources lookup failed (${res.status})`);
  const sites = (await res.json()) as { id: string; url: string }[];
  if (!sites?.length) throw new Error("No accessible Jira sites for this account");
  return { cloudId: sites[0].id, siteUrl: sites[0].url };
}

// Uses the current enhanced search endpoint (/search/jql); the legacy
// /search was removed (410). Returns up to `max` open issues.
export async function searchIssues(opts: {
  cloudId: string;
  accessToken: string;
  siteUrl: string;
  keyword?: string;
  max?: number;
}): Promise<JiraIssue[]> {
  const params = new URLSearchParams({
    jql: buildSearchJql(opts.keyword ?? ""),
    fields: "summary,status,assignee",
    maxResults: String(opts.max ?? 30),
  });
  const res = await fetch(
    `${API_BASE}/ex/jira/${opts.cloudId}/rest/api/3/search/jql?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Jira search failed (${res.status})`);
  const data = (await res.json()) as { issues?: RawIssue[] };
  return (data.issues ?? []).map((raw) => mapIssue(raw, opts.siteUrl));
}
